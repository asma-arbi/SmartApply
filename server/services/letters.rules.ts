import type { CandidateProfile } from "@/server/services/catalog";

export type LetterLanguage = "FR" | "EN";

/**
 * Quotas from SmartApply Functional Reference §9 (configurable examples).
 * Exposed via API — keep single source of truth here.
 */
export const QUOTAS = {
  FREE: {
    generatePerDay: 10,
    sendPerDay: 10,
    sendPerWeek: 30,
    regenerationsPerApplication: 2,
  },
  PREMIUM: {
    generatePerDay: 40,
    sendPerDay: 25,
    sendPerWeek: 75,
    regenerationsPerApplication: 10,
  },
} as const;

export function quotaFor(plan: "FREE" | "PREMIUM") {
  return QUOTAS[plan];
}

export function profileFacts(profile: CandidateProfile): string[] {
  return [
    profile.fullName,
    profile.city,
    profile.headline,
    ...profile.skills,
    ...profile.education,
    ...profile.experiences.flatMap((item) => [item.title, item.company, item.years]),
    ...profile.languages.map((item) => item.name),
  ]
    .map((item) => item.trim())
    .filter(Boolean);
}

function experienceLine(profile: CandidateProfile, language: LetterLanguage) {
  const first = profile.experiences[0];
  if (!first) return "";
  return language === "FR"
    ? `J’ai notamment exercé comme ${first.title} chez ${first.company} (${first.years}).`
    : `I recently worked as ${first.title} at ${first.company} (${first.years}).`;
}

function skillsLine(profile: CandidateProfile, language: LetterLanguage) {
  if (!profile.skills.length) return "";
  const list = profile.skills.slice(0, 5).join(", ");
  return language === "FR"
    ? `Mes compétences incluent ${list}.`
    : `My skills include ${list}.`;
}

function educationLine(profile: CandidateProfile, language: LetterLanguage) {
  const first = profile.education[0];
  if (!first) return "";
  return language === "FR" ? `Je suis issu(e) de ${first}.` : `My background includes ${first}.`;
}

export function renderTemplate(input: {
  language: LetterLanguage;
  profile: CandidateProfile;
  jobTitle: string;
  companyName: string;
  city: string;
}) {
  const { language, profile, jobTitle, companyName, city } = input;
  const lines = [
    experienceLine(profile, language),
    skillsLine(profile, language),
    educationLine(profile, language),
  ].filter(Boolean);

  if (language === "EN") {
    return {
      subject: `Application — ${jobTitle} — ${profile.fullName}`,
      body: [
        `Dear Hiring Team,`,
        ``,
        `I am writing to apply for the ${jobTitle} role at ${companyName}.`,
        ...lines,
        city ? `I am based in ${city} and available to discuss this opportunity.` : `I would welcome the chance to discuss this opportunity.`,
        ``,
        `Kind regards,`,
        profile.fullName,
      ].join("\n"),
    };
  }

  return {
    subject: `Candidature — ${jobTitle} — ${companyName}`,
    body: [
      `Madame, Monsieur,`,
      ``,
      `Je me permets de vous adresser ma candidature pour le poste de ${jobTitle} au sein de ${companyName}.`,
      ...lines,
      city ? `Basé(e) à ${city}, je reste disponible pour un entretien.` : `Je reste disponible pour un entretien.`,
      ``,
      `Cordialement,`,
      profile.fullName,
    ].join("\n"),
  };
}

const CLAIM_PATTERNS = [
  /(?:expert(?:e)? en|ma[iî]trise de|certifi[eé](?:e)? en|dipl[oô]m[eé](?:e)? de|travaill[eé] chez|worked at|certified in|expert in|chez)\s+([A-Za-zÀ-ÿ0-9.+#/-]+)/gi,
];

function isAllowed(token: string, allowed: string[]) {
  const needle = token.toLowerCase();
  return allowed.some((fact) => fact.includes(needle) || needle.includes(fact));
}

export function sanitizeLetter(
  text: string,
  profile: CandidateProfile,
  extraAllowed: string[] = [],
): { text: string; warnings: string[] } {
  const allowed = [...profileFacts(profile), ...extraAllowed].map((item) => item.toLowerCase());
  const warnings: string[] = [];
  let next = text;

  for (const pattern of CLAIM_PATTERNS) {
    next = next.replace(pattern, (full, claim: string) => {
      const token = claim.trim();
      if (!token || isAllowed(token, allowed)) return full;
      warnings.push(`Mention retirée (fait absent du profil) : « ${token} ».`);
      return "";
    });
  }

  next = next.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/  +/g, " ").trim();
  return { text: next, warnings };
}

export function gmailComposeUrl(to: string, subject: string, body: string) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
