import { api } from "@/lib/api";

export type LetterLanguage = "FR" | "EN";

export type LetterApplication = {
  id: string;
  targetType: "APPLICATION" | "JOB";
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN" | "JOB_PUBLISHED";
  job: {
    id: string;
    title: string;
    city: string;
    type: string;
    description: string;
    requirements: string[];
    language: LetterLanguage;
  } | null;
  company: {
    id: string;
    name: string;
    city: string;
    recruiterEmail: string;
  } | null;
};

export type CandidateProfile = {
  fullName: string;
  email: string;
  city: string;
  headline: string;
  bio?: string;
  avatarUrl?: string | null;
  skills: string[];
  education: string[];
  experiences: CandidateExperience[];
  languages: Array<{ name: string; level: string }>;
};

export type CandidateExperience = {
  id?: string;
  title: string;
  company: string;
  years: string;
  location?: string;
  locationType?: "ONSITE" | "HYBRID" | "REMOTE";
  employmentType?: "FULL_TIME" | "PART_TIME" | "SELF_EMPLOYED" | "FREELANCE" | "CONTRACT" | "INTERNSHIP" | "APPRENTICESHIP";
  source?: string;
  isCurrent?: boolean;
  startMonth?: number;
  startYear?: number;
  endMonth?: number;
  endYear?: number;
  description?: string;
  skills?: string[];
  mediaUrl?: string;
  notifyNetwork?: boolean;
};

export type CandidateExperienceInput = Omit<CandidateExperience, "id" | "years"> & {
  startMonth: number;
  startYear: number;
  isCurrent: boolean;
};

export async function createCandidateExperience(input: CandidateExperienceInput) {
  return api<{ experience: CandidateExperience }>("/me/experiences", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type ApplicationLetter = {
  id: string;
  applicationId: string | null;
  targetType: "APPLICATION" | "JOB";
  language: LetterLanguage;
  subject: string;
  body: string;
  source: "AI" | "TEMPLATE";
  status: "DRAFT" | "READY" | "GMAIL_OPENED" | "SENT" | "FAILED";
  warnings: string[];
  recipient: string | null;
  sentAt: string | null;
  gmailUrl: string | null;
  job: { id: string; title: string } | null;
  company: { id: string; name: string } | null;
};

export type LetterUsage = {
  plan: "FREE" | "PREMIUM";
  generate: { used: number; limit: number };
  send: { used: number; limit: number };
  sendWeek: { used: number; limit: number };
  regenerationsPerApplication: number;
};

export type CatalogCompany = {
  id: string;
  name: string;
  city: string;
  sector: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  recruiterEmail?: string;
  contactEmail?: string;
  websiteUrl?: string;
  isClaimed: boolean;
  isVerified: boolean;
  jobs: Array<{ id: string; title: string; city: string; type: string }>;
};

export async function fetchCatalogCompanies() {
  const data = await api<{ items: CatalogCompany[] }>("/catalog/companies");
  return data.items;
}

export async function fetchLetterApplications() {
  return api<{ items: LetterApplication[]; profile: CandidateProfile }>("/letters/applications");
}

export async function fetchLetterUsage() {
  return api<LetterUsage>("/letters/usage");
}

export async function fetchLetters() {
  const data = await api<{ items: ApplicationLetter[] }>("/letters");
  return data.items;
}

export async function generateLetterApi(applicationId: string, language: LetterLanguage) {
  return api<{ letter: ApplicationLetter; usage: LetterUsage; ai: boolean }>("/letters/generate", {
    method: "POST",
    body: JSON.stringify({ applicationId, language }),
  });
}

export async function updateLetterApi(id: string, input: { subject?: string; body?: string }) {
  const data = await api<{ letter: ApplicationLetter }>(`/letters/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  return data.letter;
}

export async function sendLetterApi(id: string) {
  return api<{
    letter: ApplicationLetter;
    gmailUrl: string;
    usage: LetterUsage;
    delivery: "gmail_compose";
  }>(`/letters/${id}/send`, {
    method: "POST",
    body: JSON.stringify({ confirm: true }),
  });
}
