"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { isUuid } from "@/lib/mappers";
import { candidateDisplayName } from "@/lib/candidate-name";
import { verifyServerUser } from "@/server/lib/auth-server";
import { NotFoundError, ValidationError } from "@/server/lib/errors";
import { connectDB } from "@/server/lib/mongodb";
import { getPublicUsers } from "@/server/lib/users";
import { CandidateProfile, Company } from "@/server/models/catalog.model";
import { defaultCompanyId, profileFor } from "@/server/services/catalog";

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
type CompanyVisual = { _id: unknown; name?: string | null; logoUrl?: string | null; coverUrl?: string | null };
type CandidateVisual = { fullName?: string | null; avatarUrl?: string | null; coverUrl?: string | null };

function fileFrom(formData: FormData, maxBytes: number, allowed: Record<string, string>) {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new ValidationError("Fichier requis.");
  if (!allowed[file.type]) throw new ValidationError("Format de fichier non accepté.");
  if (file.size <= 0 || file.size > maxBytes) throw new ValidationError("Taille de fichier non acceptée.");
  return file;
}

async function persistFile(userId: string, file: File, folder: string, extension: string) {
  const filename = `${userId}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${folder}/${filename}`;
}

export async function getCandidatePublicProfileAction(candidateId: string) {
  if (!isUuid(candidateId)) throw new NotFoundError("Candidat introuvable.");
  const users = await getPublicUsers([candidateId]);
  const author = users.get(candidateId);
  if (!author) throw new NotFoundError("Candidat introuvable.");
  const profile = author.email ? await profileFor(author.email) : null;
  return {
    id: author.id,
    name: candidateDisplayName(profile?.fullName, author.name),
    email: author.email,
    city: profile?.city ?? null,
    headline: profile?.headline ?? "",
    bio: profile?.bio ?? "",
    avatarUrl: profile?.avatarUrl ?? null,
    coverUrl: profile?.coverUrl ?? null,
    skills: profile?.skills ?? [],
    education: profile?.education ?? [],
    experiences: profile?.experiences ?? [],
    languages: profile?.languages ?? [],
  };
}

export async function getMyProfileVisualsAction() {
  const user = await verifyServerUser();
  await connectDB();
  const email = user.email.toLowerCase();
  if (user.role === "COMPANY" || user.role === "ADMIN") {
    const companyId = await defaultCompanyId(user.role, email);
    const company = (companyId
      ? await Company.findById(companyId).lean()
      : await Company.findOne({ $or: [{ ownerEmail: email }, { recruiterEmail: email }] }).sort({ updatedAt: -1 }).lean()) as unknown as CompanyVisual | null;
    return { kind: "company" as const, url: company?.logoUrl ?? null, coverUrl: company?.coverUrl ?? null, companyId: company ? String(company._id) : null, name: company?.name ?? null };
  }
  const profile = await CandidateProfile.findOne({ email }).select("avatarUrl coverUrl fullName").lean() as unknown as CandidateVisual | null;
  return { kind: "candidate" as const, url: profile?.avatarUrl ?? null, coverUrl: profile?.coverUrl ?? null, name: profile?.fullName ?? null };
}

export async function uploadProfileAvatarAction(formData: FormData) {
  const user = await verifyServerUser();
  const file = fileFrom(formData, Math.floor(2.5 * 1024 * 1024), IMAGE_TYPES);
  const url = await persistFile(user.id, file, "avatars", IMAGE_TYPES[file.type]!);
  await connectDB();
  const email = user.email.toLowerCase();

  if (user.role === "COMPANY" || user.role === "ADMIN") {
    const companyId = await defaultCompanyId(user.role, email);
    const company = companyId
      ? await Company.findById(companyId)
      : await Company.findOne({ $or: [{ ownerEmail: email }, { recruiterEmail: email }] }).sort({ updatedAt: -1 });
    if (company) {
      await Company.findByIdAndUpdate(company._id, { $set: { logoUrl: url } });
      return { kind: "company" as const, url, coverUrl: company.coverUrl ?? null };
    }
    const created = await Company.create({
      name: user.name || email.split("@")[0]?.replace(/[._]/g, " ") || "Entreprise",
      city: "Tunisie", sector: "Recrutement", logoUrl: url,
      recruiterEmail: email, ownerEmail: email, isClaimed: true, isVerified: false,
    });
    return { kind: "company" as const, url, coverUrl: created.coverUrl ?? null };
  }

  await CandidateProfile.findOneAndUpdate(
    { email },
    { $set: { avatarUrl: url }, $setOnInsert: { email, fullName: user.name || "", city: "Tunisie", headline: "", skills: [], education: [], experiences: [], languages: [] } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { kind: "candidate" as const, url };
}

export async function uploadProfileCoverAction(formData: FormData) {
  const user = await verifyServerUser();
  const file = fileFrom(formData, 5 * 1024 * 1024, IMAGE_TYPES);
  const url = await persistFile(user.id, file, "covers", IMAGE_TYPES[file.type]!);
  await connectDB();
  const email = user.email.toLowerCase();

  if (user.role === "COMPANY" || user.role === "ADMIN") {
    const companyId = await defaultCompanyId(user.role, email);
    const company = companyId
      ? await Company.findById(companyId)
      : await Company.findOne({ $or: [{ ownerEmail: email }, { recruiterEmail: email }] }).sort({ updatedAt: -1 });
    if (company) {
      await Company.findByIdAndUpdate(company._id, { $set: { coverUrl: url } });
      return { kind: "company" as const, url };
    }
    await Company.create({ name: user.name || email.split("@")[0]?.replace(/[._]/g, " ") || "Entreprise", city: "Tunisie", sector: "Recrutement", coverUrl: url, recruiterEmail: email, ownerEmail: email, isClaimed: true, isVerified: false });
    return { kind: "company" as const, url };
  }

  await CandidateProfile.findOneAndUpdate(
    { email },
    { $set: { coverUrl: url }, $setOnInsert: { email, fullName: user.name || "", city: "Tunisie", headline: "", skills: [], education: [], experiences: [], languages: [] } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  const saved = await CandidateProfile.findOne({ email }).select("coverUrl").lean() as { coverUrl?: string | null } | null;
  if (saved?.coverUrl !== url) throw new Error("La couverture n’a pas pu être enregistrée. Réessayez.");
  return { kind: "candidate" as const, url };
}

const MEDIA_TYPES: Record<string, string> = {
  ...IMAGE_TYPES,
  "video/mp4": "mp4",
  "video/webm": "webm",
  "application/pdf": "pdf",
};

export async function uploadPostMediaAction(formData: FormData) {
  const user = await verifyServerUser();
  const file = fileFrom(formData, 25 * 1024 * 1024, MEDIA_TYPES);
  const extension = MEDIA_TYPES[file.type]!;
  const filename = `${user.id}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const directory = path.join(process.cwd(), "public", "uploads", "posts");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
  const type = file.type.startsWith("video/") ? "video" : file.type === "application/pdf" ? "document" : "image";
  return { url: `/uploads/posts/${filename}`, type, name: file.name.slice(0, 180) };
}
