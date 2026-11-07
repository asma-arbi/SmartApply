import { connectDB } from "@/server/lib/mongodb";
import { Company, Job, Application, CandidateProfile } from "@/server/models/catalog.model";
import { User } from "@/server/models/user.model";

/** Skip catalog queries briefly after unreachable errors to free resources. */
let catalogCooldownUntil = 0;

function catalogUnavailable(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return /Can't reach database|ECONNREFUSED|ETIMEDOUT/i.test(message);
}

function markCatalogDown() {
  catalogCooldownUntil = Date.now() + 60_000;
}

function catalogPaused() {
  return Date.now() < catalogCooldownUntil;
}

export type CatalogCompany = {
  id: string;
  name: string;
  city: string;
  sector: string;
  isClaimed: boolean;
  isVerified: boolean;
  recruiterEmail: string;
  contactEmail?: string;
  websiteUrl?: string;
  ownerEmail?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
};

export type CatalogJob = {
  id: string;
  companyId: string;
  title: string;
  city: string;
  type: "CDI" | "STAGE" | "PFE";
  language: "FR" | "EN";
  status: "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";
  description: string;
  requirements: string[];
};

export type CandidateProfile = {
  fullName: string;
  email: string;
  city: string;
  headline: string;
  bio?: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  skills: string[];
  education: string[];
  experiences: Array<{
    id?: string; title: string; company: string; years: string; location?: string;
    locationType?: string; employmentType?: string; isCurrent?: boolean; startMonth?: number;
    startYear?: number; endMonth?: number; endYear?: number; description?: string;
    skills?: string[]; mediaUrl?: string; notifyNetwork?: boolean;
  }>;
  languages: Array<{ name: string; level: string }>;
};

export function idsMatching<T extends { id: string }>(
  items: T[],
  q: string | undefined,
  pick: (item: T) => Array<string | null | undefined>,
) {
  const needle = q?.trim().toLowerCase();
  if (!needle) return [];
  return items
    .filter((item) => pick(item).some((value) => (value ?? "").toLowerCase().includes(needle)))
    .map((item) => item.id);
}

export function publicCompany(company?: CatalogCompany | null) {
  if (!company) return null;
  return {
    id: company.id,
    name: company.name,
    city: company.city,
    verified: company.isVerified,
  };
}

export function publicJob(job?: CatalogJob | null, companyName?: string | null) {
  if (!job) return null;
  return {
    id: job.id,
    title: job.title,
    city: job.city,
    type: job.type,
    companyId: job.companyId,
    companyName: companyName ?? null,
  };
}

function docToCompany(doc: any): CatalogCompany {
  return {
    ...doc,
    id: String(doc._id),
  };
}

function docToJob(doc: any): CatalogJob {
  return {
    ...doc,
    id: String(doc._id),
  };
}

function docToApplication(doc: any) {
  return {
    ...doc,
    id: String(doc._id),
  };
}

export async function getCompany(id?: string | null) {
  if (!id) return null;
  try {
    await connectDB();
    const doc = await Company.findById(id).lean();
    return doc ? docToCompany(doc) : null;
  } catch {
    return null;
  }
}

export async function getJob(id?: string | null) {
  if (!id) return null;
  try {
    await connectDB();
    const doc = await Job.findById(id).lean();
    return doc ? docToJob(doc) : null;
  } catch {
    return null;
  }
}

export async function getApplication(id?: string | null) {
  if (!id) return null;
  try {
    await connectDB();
    const doc = await Application.findById(id).lean();
    return doc ? docToApplication(doc) : null;
  } catch {
    return null;
  }
}

export async function companiesByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, CatalogCompany>();
  try {
    await connectDB();
    const rows = await Company.find({ _id: { $in: ids } }).lean();
    return new Map(rows.map((row) => [String(row._id), docToCompany(row)]));
  } catch {
    return new Map();
  }
}

export async function jobsByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, CatalogJob>();
  try {
    await connectDB();
    const rows = await Job.find({ _id: { $in: ids } }).lean();
    return new Map(rows.map((row) => [String(row._id), docToJob(row)]));
  } catch {
    return new Map();
  }
}

export async function defaultCompanyId(role: string, email?: string) {
  try {
    await connectDB();
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      const owned = await Company.findOne({ $or: [{ ownerEmail: normalizedEmail }, { recruiterEmail: normalizedEmail }] })
        .sort({ updatedAt: -1 })
        .lean() as { _id: unknown } | null;
      if (owned) return String(owned._id);
    }
    if (role === "ADMIN") {
      const verified = await Company.findOne({ isClaimed: true, isVerified: true })
        .sort({ name: 1 })
        .lean() as { _id: unknown } | null;
      return verified ? String(verified._id) : null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function companyIdsMatching(q?: string) {
  const needle = q?.trim();
  if (!needle) return [];
  try {
    await connectDB();
    const regex = new RegExp(needle, "i");
    const rows = await Company.find({ $or: [{ name: regex }, { city: regex }, { sector: regex }] })
      .select("_id")
      .lean();
    return rows.map((r) => String(r._id));
  } catch {
    return [];
  }
}

export async function jobIdsMatching(q?: string) {
  const needle = q?.trim();
  if (!needle) return [];
  try {
    await connectDB();
    const regex = new RegExp(needle, "i");
    const rows = await Job.find({ $or: [{ title: regex }, { city: regex }] })
      .select("_id")
      .lean();
    return rows.map((r) => String(r._id));
  } catch {
    return [];
  }
}

export async function listCompanies() {
  if (catalogPaused()) return [];
  try {
    await connectDB();
    const rows = await Company.find().sort({ name: 1 }).lean();
    return rows.map(docToCompany);
  } catch (err) {
    if (catalogUnavailable(err)) markCatalogDown();
    return [];
  }
}

export async function updateCompanyPublicContacts(
  user: import("@/server/middleware/auth").AuthUser,
  companyId: string,
  input: { websiteUrl: string; contactEmail: string },
) {
  await connectDB();
  const company = await Company.findById(companyId).select("ownerEmail recruiterEmail").lean() as {
    ownerEmail?: string | null; recruiterEmail?: string | null;
  } | null;
  if (!company) throw new Error("Entreprise introuvable.");
  const email = user.email.trim().toLowerCase();
  if (user.role !== "ADMIN" && ![company.ownerEmail, company.recruiterEmail].some((owner) => owner?.trim().toLowerCase() === email)) {
    throw new Error("Vous n’êtes pas autorisé à modifier cette entreprise.");
  }
  const websiteUrl = input.websiteUrl.trim();
  if (websiteUrl) {
    try {
      const parsed = new URL(websiteUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
    } catch {
      throw new Error("Saisissez une adresse web valide commençant par https:// ou http://.");
    }
  }
  const contactEmail = input.contactEmail.trim().toLowerCase();
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    throw new Error("Saisissez une adresse e-mail de contact valide.");
  }
  await Company.updateOne({ _id: companyId }, { $set: { websiteUrl, contactEmail } });
  return { websiteUrl, contactEmail };
}

export async function listPublishedJobs(companyId?: string) {
  if (catalogPaused()) return [];
  try {
    await connectDB();
    const filter: Record<string, unknown> = { status: "PUBLISHED" };
    if (companyId) filter.companyId = companyId;
    const rows = await Job.find(filter).sort({ title: 1 }).lean();
    return rows.map(docToJob);
  } catch (err) {
    if (catalogUnavailable(err)) markCatalogDown();
    return [];
  }
}

export async function listCompaniesWithJobs() {
  if (catalogPaused()) return [];
  try {
    const [companies, jobs] = await Promise.all([listCompanies(), listPublishedJobs()]);
    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      city: company.city,
      sector: company.sector,
      logoUrl: company.logoUrl ?? null,
      coverUrl: company.coverUrl ?? null,
      recruiterEmail: company.recruiterEmail,
      contactEmail: company.contactEmail ?? "",
      websiteUrl: company.websiteUrl ?? "",
      isClaimed: company.isClaimed,
      isVerified: company.isVerified,
      jobs: jobs
        .filter((job) => job.companyId === company.id)
        .map((job) => ({
          id: job.id,
          title: job.title,
          city: job.city,
          type: job.type,
        })),
    }));
  } catch (err) {
    if (catalogUnavailable(err)) markCatalogDown();
    return [];
  }
}

function asList<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function profileFor(email: string): Promise<CandidateProfile | null> {
  await connectDB();
  const row = await CandidateProfile.findOne({ email }).lean();
  if (!row) return null;
  return {
    fullName: (row as any).fullName,
    email: (row as any).email,
    city: (row as any).city,
    headline: cleanCandidateHeadline((row as any).headline),
    bio: (row as any).bio ?? "",
    avatarUrl: (row as any).avatarUrl ?? null,
    coverUrl: (row as any).coverUrl ?? null,
    skills: (row as any).skills,
    education: (row as any).education,
    experiences: asList((row as any).experiences),
    languages: asList((row as any).languages),
  };
}

function cleanCandidateHeadline(value: unknown): string {
  const headline = typeof value === "string" ? value.trim() : "";
  return /^candidat\s+smartapply(?:\s+tunisie)?$/i.test(headline) ? "" : headline;
}

export async function applicationsFor(email: string) {
  await connectDB();
  const rows = await Application.find({ ownerEmail: email }).sort({ updatedAt: -1 }).lean();
  const jobIds = [...new Set(rows.map((r) => (r as any).jobId))];
  const jobs = await Job.find({ _id: { $in: jobIds } }).lean();
  const jobMap = new Map(jobs.map((j) => [String(j._id), j]));
  const companyIds = [...new Set(jobs.map((j) => (j as any).companyId))];
  const companies = await Company.find({ _id: { $in: companyIds } }).lean();
  const companyMap = new Map(companies.map((c) => [String(c._id), c]));

  return rows.map((item: any) => {
    const job = jobMap.get(item.jobId) as any;
    const company = job ? (companyMap.get(job.companyId) as any) : null;
    return {
      id: String(item._id),
      status: item.status,
      job: job
        ? {
            id: String(job._id),
            title: job.title,
            city: job.city,
            type: job.type,
            description: job.description,
            requirements: job.requirements,
            language: job.language,
          }
        : null,
      company: company
        ? {
            id: String(company._id),
            name: company.name,
            city: company.city,
            recruiterEmail: company.recruiterEmail,
          }
        : null,
    };
  });
}
