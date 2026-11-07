import { connectDB } from "@/server/lib/mongodb";
import {
  ConfirmRequiredError,
  ForbiddenError,
  NotFoundError,
  QuotaExceededError,
  ValidationError,
} from "@/server/lib/errors";
import type { AuthUser } from "@/server/middleware/auth";
import {
  applicationsFor,
  listPublishedJobs,
  getApplication,
  getCompany,
  getJob,
  profileFor,
  type CandidateProfile,
} from "@/server/services/catalog";
import {
  gmailComposeUrl,
  quotaFor,
  renderTemplate,
  sanitizeLetter,
  type LetterLanguage,
} from "@/server/services/letters.rules";
import { ApplicationLetter, LetterUsageEvent } from "@/server/models/letter.model";

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date = new Date()) {
  const day = startOfUtcDay(date);
  const weekday = day.getUTCDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  day.setUTCDate(day.getUTCDate() - offset);
  return day;
}

function emptyProfile(email: string): CandidateProfile {
  return {
    fullName: "",
    email,
    city: "",
    headline: "",
    skills: [],
    education: [],
    experiences: [],
    languages: [],
  };
}

async function liveProfile(email: string) {
  return (await profileFor(email)) ?? emptyProfile(email);
}

async function usageCounters(userId: string) {
  await connectDB();
  const day = startOfUtcDay();
  const week = startOfUtcWeek();
  const [generateDay, sendDay, sendWeek] = await Promise.all([
    LetterUsageEvent.countDocuments({ userId, kind: "GENERATE", createdAt: { $gte: day } }),
    LetterUsageEvent.countDocuments({ userId, kind: "SEND", createdAt: { $gte: day } }),
    LetterUsageEvent.countDocuments({ userId, kind: "SEND", createdAt: { $gte: week } }),
  ]);
  return { generateDay, sendDay, sendWeek };
}

export async function letterUsage(user: AuthUser) {
  const used = await usageCounters(user.id);
  const limit = quotaFor(user.plan);
  return {
    plan: user.plan,
    generate: { used: used.generateDay, limit: limit.generatePerDay },
    send: { used: used.sendDay, limit: limit.sendPerDay },
    sendWeek: { used: used.sendWeek, limit: limit.sendPerWeek },
    regenerationsPerApplication: limit.regenerationsPerApplication,
  };
}

function assertCandidate(user: AuthUser) {
  if (user.role !== "CANDIDATE" && user.role !== "ADMIN") {
    throw new ForbiddenError("Le studio de lettres est réservé aux candidats.");
  }
}

async function resolveApplication(user: AuthUser, applicationId: string) {
  const application = await getApplication(applicationId);
  if (application) {
    if (user.role !== "ADMIN" && application.ownerEmail.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenError("Cette candidature ne vous appartient pas.");
    }
    const job = await getJob(application.jobId);
    const company = await getCompany(job?.companyId);
    if (!job || !company) throw new NotFoundError("Offre ou entreprise liée introuvable.");
    return { applicationId: application.id, targetType: "APPLICATION" as const, job, company };
  }

  // A published job can be used to draft a letter without creating or impersonating
  // an application record owned by the applications module.
  const job = await getJob(applicationId);
  if (!job || job.status !== "PUBLISHED") throw new NotFoundError("Candidature ou offre publiée introuvable.");
  const company = await getCompany(job?.companyId);
  if (!job || !company) throw new NotFoundError("Offre ou entreprise liée introuvable.");
  return { applicationId: null, targetType: "JOB" as const, job, company };
}

async function callOpenAiOnce(input: {
  language: LetterLanguage;
  profile: CandidateProfile;
  jobTitle: string;
  companyName: string;
  city: string;
  description: string;
}): Promise<{ subject: string; body: string } | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You write short application letters. Use ONLY facts from the JSON. Never invent employers, diplomas, skills or dates. Reply as JSON {subject, body}.",
        },
        {
          role: "user",
          content: JSON.stringify({
            language: input.language,
            job: {
              title: input.jobTitle,
              company: input.companyName,
              city: input.city,
              description: input.description,
            },
            profile: input.profile,
          }),
        },
      ],
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = json.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, "")) as {
    subject?: string;
    body?: string;
  };
  if (!parsed.subject || !parsed.body) return null;
  return { subject: parsed.subject, body: parsed.body };
}

async function maybeGenerateWithAi(input: {
  language: LetterLanguage;
  profile: CandidateProfile;
  jobTitle: string;
  companyName: string;
  city: string;
  description: string;
}): Promise<{ subject: string; body: string; source: "AI" | "TEMPLATE" }> {
  const fallback = renderTemplate(input);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ai = await callOpenAiOnce(input);
      if (ai) return { ...ai, source: "AI" };
    } catch {
      /* retry once, then template */
    }
  }
  return { ...fallback, source: "TEMPLATE" };
}

async function toDto(letter: {
  _id?: unknown;
  id?: string;
  applicationId: string | null;
  targetType?: "APPLICATION" | "JOB";
  jobId: string;
  language: "FR" | "EN";
  subject: string;
  body: string;
  source: "AI" | "TEMPLATE";
  status: "DRAFT" | "READY" | "GMAIL_OPENED" | "SENT" | "FAILED";
  warnings: string[];
  recipient: string | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  const job = await getJob(letter.jobId);
  const company = job ? await getCompany(job.companyId) : null;
  return {
    id: String(letter._id ?? letter.id),
    applicationId: letter.applicationId,
    targetType: letter.targetType ?? "APPLICATION",
    language: letter.language,
    subject: letter.subject,
    body: letter.body,
    source: letter.source,
    status: letter.status,
    warnings: letter.warnings,
    recipient: letter.recipient,
    sentAt: letter.sentAt?.toISOString() ?? null,
    createdAt: letter.createdAt.toISOString(),
    updatedAt: letter.updatedAt.toISOString(),
    job: job ? { id: job.id, title: job.title } : null,
    company: company ? { id: company.id, name: company.name } : null,
    gmailUrl: letter.recipient
      ? gmailComposeUrl(letter.recipient, letter.subject, letter.body)
      : null,
  };
}

export async function listLetterApplications(user: AuthUser) {
  assertCandidate(user);
  const [applications, profile] = await Promise.all([applicationsFor(user.email), liveProfile(user.email)]);
  const items = applications.length
    ? applications.map((item) => ({ ...item, targetType: "APPLICATION" as const }))
    : await (async () => {
        const jobs = await listPublishedJobs();
        const result = [];
        for (const job of jobs) {
          const company = await getCompany(job.companyId);
          if (!company) continue;
          result.push({
            id: job.id,
            targetType: "JOB" as const,
            status: "JOB_PUBLISHED" as const,
            job: {
              id: job.id,
              title: job.title,
              city: job.city,
              type: job.type,
              description: job.description,
              requirements: job.requirements,
              language: job.language,
            },
            company: {
              id: company.id,
              name: company.name,
              city: company.city,
              recruiterEmail: company.recruiterEmail,
            },
          });
        }
        return result;
      })();
  return { items, profile };
}

export async function listLetters(user: AuthUser) {
  assertCandidate(user);
  await connectDB();
  const rows = await ApplicationLetter.find({ userId: user.id })
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean() as any[];
  return { items: await Promise.all(rows.map((row) => toDto(row))) };
}

export async function generateLetter(user: AuthUser, applicationId: string, language?: LetterLanguage) {
  assertCandidate(user);
  const usage = await letterUsage(user);
  if (usage.generate.used >= usage.generate.limit) {
    throw new QuotaExceededError(
      `Quota de génération atteint (${usage.generate.used}/${usage.generate.limit} aujourd'hui).`,
    );
  }

  const [{ applicationId: resolvedApplicationId, targetType, job, company }, profile] = await Promise.all([
    resolveApplication(user, applicationId),
    liveProfile(user.email),
  ]);

  await connectDB();
  const versionFilter = targetType === "APPLICATION"
    ? { userId: user.id, applicationId: resolvedApplicationId }
    : { userId: user.id, targetType: "JOB", jobId: job.id };
  const priorVersions = await ApplicationLetter.countDocuments(versionFilter);
  const maxVersions = 1 + usage.regenerationsPerApplication;
  if (priorVersions >= maxVersions) {
    throw new QuotaExceededError(
      `Limite de régénérations atteinte (${priorVersions}/${maxVersions} versions pour cette candidature).`,
    );
  }

  const lang = language ?? job.language;
  const generated = await maybeGenerateWithAi({
    language: lang,
    profile,
    jobTitle: job.title,
    companyName: company.name,
    city: profile.city || job.city,
    description: job.description,
  });
  const cleanBody = sanitizeLetter(generated.body, profile, [job.title, company.name, job.city]);
  const cleanSubject = sanitizeLetter(generated.subject, profile, [job.title, company.name]);

  const [letter] = await Promise.all([
    ApplicationLetter.create({
      applicationId: resolvedApplicationId,
      targetType,
      userId: user.id,
      jobId: job.id,
      language: lang,
      subject: cleanSubject.text || generated.subject,
      body: cleanBody.text,
      source: generated.source,
      status: "READY",
      warnings: [...cleanSubject.warnings, ...cleanBody.warnings],
      recipient: company.recruiterEmail,
    }),
    LetterUsageEvent.create({ userId: user.id, kind: "GENERATE" }),
  ]);

  return {
    letter: await toDto(letter as any),
    usage: await letterUsage(user),
    ai: generated.source === "AI",
    regenerations: {
      used: priorVersions,
      limit: usage.regenerationsPerApplication,
      versions: priorVersions + 1,
      maxVersions,
    },
  };
}

export async function getLetter(user: AuthUser, id: string) {
  assertCandidate(user);
  await connectDB();
  const letter = await ApplicationLetter.findById(id).lean() as any;
  if (!letter) throw new NotFoundError("Lettre introuvable.");
  if (user.role !== "ADMIN" && letter.userId !== user.id) throw new ForbiddenError();
  return toDto(letter);
}

export async function updateLetter(user: AuthUser, id: string, input: { subject?: string; body?: string }) {
  assertCandidate(user);
  await connectDB();
  const existing = await ApplicationLetter.findById(id).lean() as any;
  if (!existing) throw new NotFoundError("Lettre introuvable.");
  if (user.role !== "ADMIN" && existing.userId !== user.id) throw new ForbiddenError();
  if (existing.status === "SENT") throw new ValidationError("Une lettre envoyée n'est plus modifiable.");

  const [job, profile] = await Promise.all([getJob(existing.jobId), liveProfile(user.email)]);
  const company = job ? await getCompany(job.companyId) : null;
  const extra = [job?.title ?? "", company?.name ?? "", job?.city ?? ""];
  const subject = input.subject
    ? sanitizeLetter(input.subject, profile, extra)
    : { text: existing.subject, warnings: [] as string[] };
  const body = input.body
    ? sanitizeLetter(input.body, profile, extra)
    : { text: existing.body, warnings: [] as string[] };

  const letter = await ApplicationLetter.findByIdAndUpdate(
    id,
    {
      $set: {
        subject: subject.text,
        body: body.text,
        warnings: [...existing.warnings, ...subject.warnings, ...body.warnings],
        status: "READY",
      },
    },
    { new: true },
  ).lean() as any;
  return toDto(letter);
}

export async function sendLetter(user: AuthUser, id: string, confirm?: boolean) {
  assertCandidate(user);
  if (confirm !== true) throw new ConfirmRequiredError();

  const usage = await letterUsage(user);
  if (usage.send.used >= usage.send.limit) {
    throw new QuotaExceededError(
      `Quota d'envoi journalier atteint (${usage.send.used}/${usage.send.limit}).`,
    );
  }
  if (usage.sendWeek.used >= usage.sendWeek.limit) {
    throw new QuotaExceededError(
      `Quota d'envoi hebdomadaire atteint (${usage.sendWeek.used}/${usage.sendWeek.limit}).`,
    );
  }

  await connectDB();
  const existing = await ApplicationLetter.findById(id).lean() as any;
  if (!existing) throw new NotFoundError("Lettre introuvable.");
  if (user.role !== "ADMIN" && existing.userId !== user.id) throw new ForbiddenError();
  if (existing.status === "SENT") {
    if (!existing.recipient) throw new ValidationError("Cette lettre n'a pas de destinataire.");
    return {
      letter: await toDto(existing),
      gmailUrl: gmailComposeUrl(existing.recipient, existing.subject, existing.body),
      usage,
      delivery: "gmail_compose" as const,
      alreadySent: true,
    };
  }

  if (!existing.recipient) throw new ValidationError("Cette lettre n'a pas de destinataire.");
  const recipient = existing.recipient;
  const gmailUrl = gmailComposeUrl(recipient, existing.subject, existing.body);

  const [letter] = await Promise.all([
    ApplicationLetter.findByIdAndUpdate(
      id,
      { $set: { status: "GMAIL_OPENED", gmailOpenedAt: new Date() } },
      { new: true },
    ).lean(),
    LetterUsageEvent.create({ userId: user.id, kind: "SEND" }),
  ]);

  return {
    letter: await toDto(letter as any),
    gmailUrl,
    usage: await letterUsage(user),
    delivery: "gmail_compose" as const,
    alreadySent: false,
  };
}
