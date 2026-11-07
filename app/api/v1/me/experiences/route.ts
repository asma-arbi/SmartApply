import { randomUUID } from "node:crypto";
import { z } from "zod";
import { ok, parseJsonBody } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { connectDB } from "@/server/lib/mongodb";
import { CandidateProfile } from "@/server/models/catalog.model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ExperienceSchema = z.object({
  title: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(120),
  location: z.string().trim().max(120).optional(),
  locationType: z.enum(["ONSITE", "HYBRID", "REMOTE"]).optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "SELF_EMPLOYED", "FREELANCE", "CONTRACT", "INTERNSHIP", "APPRENTICESHIP"]).optional(),
  source: z.enum(["LINKEDIN", "COMPANY_SITE", "INDEED", "JOB_BOARD", "REFERRAL", "RECRUITER", "AGENCY", "OTHER"]).optional(),
  isCurrent: z.boolean(),
  startMonth: z.number().int().min(1).max(12),
  startYear: z.number().int().min(1950).max(new Date().getFullYear() + 1),
  endMonth: z.number().int().min(1).max(12).optional(),
  endYear: z.number().int().min(1950).max(new Date().getFullYear() + 1).optional(),
  description: z.string().trim().max(3000).optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  mediaUrl: z.string().url().max(2000).optional().or(z.literal("")),
  notifyNetwork: z.boolean().default(false),
}).strict().refine((value) => value.isCurrent || (value.endMonth !== undefined && value.endYear !== undefined), {
  message: "Indiquez le mois et l’année de fin, ou cochez le poste actuel.",
  path: ["endYear"],
}).refine((value) => value.isCurrent || value.endYear! > value.startYear || (value.endYear === value.startYear && value.endMonth! >= value.startMonth), {
  message: "La date de fin doit être postérieure à la date de début.",
  path: ["endYear"],
});

export const POST = withAuth(async (req) => {
  const input = await parseJsonBody(req, ExperienceSchema);
  await connectDB();
  const email = req.user.email.toLowerCase();
  const experience = {
    ...input,
    id: randomUUID(),
    years: input.isCurrent ? `${input.startYear}–aujourd’hui` : `${input.startYear}–${input.endYear}`,
    createdAt: new Date().toISOString(),
  };
  await CandidateProfile.findOneAndUpdate(
    { email },
    {
      $push: { experiences: experience },
      $setOnInsert: {
        email,
        fullName: email.split("@")[0]?.replace(/[._]/g, " ") || "Candidat",
        city: "Tunisie",
        headline: "",
        skills: [], education: [], languages: [],
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return ok({ experience }, { status: 201 });
}, { roles: ["CANDIDATE"] });
