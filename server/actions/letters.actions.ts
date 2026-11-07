"use server";

import { verifyServerUser } from "@/server/lib/auth-server";
import {
  letterUsage,
  listLetters,
  listLetterApplications,
  generateLetter,
  getLetter,
  updateLetter,
  sendLetter,
} from "@/server/services/letters.service";
import type { LetterLanguage } from "@/server/services/letters.rules";
import type { CandidateExperienceInput } from "@/lib/letters-api";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { connectDB } from "@/server/lib/mongodb";
import { CandidateProfile } from "@/server/models/catalog.model";

export async function letterUsageAction() {
  const user = await verifyServerUser();
  return letterUsage(user);
}

export async function listLettersAction() {
  const user = await verifyServerUser();
  return listLetters(user);
}

export async function listLetterApplicationsAction() {
  const user = await verifyServerUser();
  return listLetterApplications(user);
}

export async function generateLetterAction(applicationId: string, language?: LetterLanguage) {
  const user = await verifyServerUser();
  return generateLetter(user, applicationId, language);
}

export async function getLetterAction(id: string) {
  const user = await verifyServerUser();
  return getLetter(user, id);
}

export async function updateLetterAction(id: string, input: { subject?: string; body?: string }) {
  const user = await verifyServerUser();
  return updateLetter(user, id, input);
}

export async function sendLetterAction(id: string, confirm?: boolean) {
  const user = await verifyServerUser();
  return sendLetter(user, id, confirm);
}

export async function updateCandidateBioAction(bio: string) {
  const user = await verifyServerUser();
  if (user.role !== "CANDIDATE") throw new Error("Cette action est réservée aux candidats.");
  const parsedBio = z.string().trim().max(1200, "La bio ne peut pas dépasser 1 200 caractères.").parse(bio);
  await connectDB();
  await CandidateProfile.findOneAndUpdate(
    { email: user.email.toLowerCase() },
    {
      $set: { bio: parsedBio },
      $setOnInsert: {
        email: user.email.toLowerCase(),
        fullName: user.name || "",
        city: "Tunisie",
        headline: "",
        skills: [],
        education: [],
        experiences: [],
        languages: [],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { bio: parsedBio };
}

export async function createCandidateExperienceAction(input: CandidateExperienceInput) {
  const user = await verifyServerUser();
  if (user.role !== "CANDIDATE") throw new Error("Cette action est réservée aux candidats.");
  const parsed = z.object({
    title: z.string().trim().min(2).max(120), company: z.string().trim().min(2).max(120),
    location: z.string().trim().max(120).optional(),
    locationType: z.enum(["ONSITE", "HYBRID", "REMOTE"]).optional(),
    employmentType: z.enum(["FULL_TIME", "PART_TIME", "SELF_EMPLOYED", "FREELANCE", "CONTRACT", "INTERNSHIP", "APPRENTICESHIP"]).optional(),
    source: z.enum(["LINKEDIN", "COMPANY_SITE", "INDEED", "JOB_BOARD", "REFERRAL", "RECRUITER", "AGENCY", "OTHER"]).optional(),
    isCurrent: z.boolean(), startMonth: z.number().int().min(1).max(12), startYear: z.number().int().min(1950).max(new Date().getFullYear() + 1),
    endMonth: z.number().int().min(1).max(12).optional(), endYear: z.number().int().min(1950).max(new Date().getFullYear() + 1).optional(),
    description: z.string().trim().max(3000).optional(), skills: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
    mediaUrl: z.string().url().max(2000).optional().or(z.literal("")), notifyNetwork: z.boolean().default(false),
  }).strict().refine((value) => value.isCurrent || (value.endMonth !== undefined && value.endYear !== undefined), {
    message: "Indiquez le mois et l’année de fin, ou cochez le poste actuel.", path: ["endYear"],
  }).refine((value) => value.isCurrent || value.endYear! > value.startYear || (value.endYear === value.startYear && value.endMonth! >= value.startMonth), {
    message: "La date de fin doit être postérieure à la date de début.", path: ["endYear"],
  }).parse(input);
  await connectDB();
  const email = user.email.toLowerCase();
  const experience = { ...parsed, id: randomUUID(), years: parsed.isCurrent ? `${parsed.startYear}–aujourd’hui` : `${parsed.startYear}–${parsed.endYear}`, createdAt: new Date().toISOString() };
  await CandidateProfile.findOneAndUpdate({ email }, {
    $push: { experiences: experience },
    $setOnInsert: { email, fullName: email.split("@")[0]?.replace(/[._]/g, " ") || "Candidat", city: "Tunisie", headline: "", skills: [], education: [], languages: [] },
  }, { upsert: true, new: true, setDefaultsOnInsert: true });
  return { experience };
}
