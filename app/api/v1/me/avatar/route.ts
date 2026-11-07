import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ok, fail } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { connectDB } from "@/server/lib/mongodb";
import { Company, CandidateProfile } from "@/server/models/catalog.model";
import { defaultCompanyId } from "@/server/services/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 2.5 * 1024 * 1024;
type CompanyAvatarRecord = { _id: unknown; name?: string | null; logoUrl?: string | null; coverUrl?: string | null };

function extFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  return "jpg";
}

export const GET = withAuth(async (req) => {
  await connectDB();
  const email = req.user.email.toLowerCase();

  if (req.user.role === "COMPANY" || req.user.role === "ADMIN") {
    const preferredCompanyId = await defaultCompanyId(req.user.role, email);
    const company = preferredCompanyId
      ? await Company.findById(preferredCompanyId).lean() as unknown as CompanyAvatarRecord | null
      : await Company.findOne({ $or: [{ ownerEmail: email }, { recruiterEmail: email }] }).sort({ updatedAt: -1 }).lean() as unknown as CompanyAvatarRecord | null;
    const accountCompany = await Company.findOne({ $or: [{ ownerEmail: email }, { recruiterEmail: email }] })
      .sort({ updatedAt: -1 }).lean() as unknown as CompanyAvatarRecord | null;
    return ok({
      kind: "company",
      url: company?.logoUrl ?? accountCompany?.logoUrl ?? null,
      coverUrl: company?.coverUrl ?? accountCompany?.coverUrl ?? null,
      companyId: company ? String(company._id) : null,
      name: company?.name ?? null,
    });
  }

  const profile = await CandidateProfile.findOne({ email }).lean() as any;
  return ok({
    kind: "candidate",
    url: profile?.avatarUrl ?? null,
    coverUrl: profile?.coverUrl ?? null,
    name: profile?.fullName ?? null,
  });
});

export const POST = withAuth(async (req) => {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return fail(400, "BAD_REQUEST", "Fichier image requis (champ file).");
  }
  if (!ALLOWED.has(file.type)) {
    return fail(400, "UNSUPPORTED_TYPE", "Formats acceptés : JPG, PNG, WebP, GIF.");
  }
  if (file.size > MAX_BYTES) {
    return fail(400, "FILE_TOO_LARGE", "Image trop lourde (max 2,5 Mo).");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = extFor(file.type);
  const dir = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(dir, { recursive: true });

  const filename = `${req.user.id}-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);
  const url = `/uploads/avatars/${filename}`;
  const email = req.user.email.toLowerCase();

  await connectDB();

  if (req.user.role === "COMPANY" || req.user.role === "ADMIN") {
    const preferredCompanyId = await defaultCompanyId(req.user.role, email);
    const company = preferredCompanyId
      ? await Company.findById(preferredCompanyId).lean() as unknown as CompanyAvatarRecord | null
      : await Company.findOne({ $or: [{ ownerEmail: email }, { recruiterEmail: email }] }).sort({ updatedAt: -1 }).lean() as unknown as CompanyAvatarRecord | null;

    if (company) {
      await Company.findByIdAndUpdate(company._id, { $set: { logoUrl: url } });
      return ok({ kind: "company", url, coverUrl: company.coverUrl ?? null, companyId: String(company._id) });
    }

    const created = await Company.create({
      name: email.split("@")[0]?.replace(/[._]/g, " ") || "Entreprise",
      city: "Tunisie",
      sector: "Recrutement",
      logoUrl: url,
      recruiterEmail: email,
      ownerEmail: email,
      isClaimed: true,
      isVerified: false,
    });
    return ok({ kind: "company", url, coverUrl: created.coverUrl ?? null, companyId: String(created._id) });
  }

  const existing = await CandidateProfile.findOne({ email }).lean() as any;
  if (existing) {
    await CandidateProfile.findOneAndUpdate({ email }, { $set: { avatarUrl: url } });
  } else {
    const fullName =
      email.split("@")[0]?.replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) ||
      "Candidat";
    await CandidateProfile.create({
      email,
      fullName,
      city: "Tunisie",
      headline: "",
      avatarUrl: url,
      skills: [],
      education: [],
      experiences: [],
      languages: [],
    });
  }

  const updatedProfile = await CandidateProfile.findOne({ email }).select("coverUrl").lean() as { coverUrl?: string | null } | null;
  return ok({ kind: "candidate", url, coverUrl: updatedProfile?.coverUrl ?? null });
});
