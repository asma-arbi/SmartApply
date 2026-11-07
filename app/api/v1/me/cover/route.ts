import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ok, fail } from "@/server/lib/api";
import { withAuth } from "@/server/middleware/auth";
import { connectDB } from "@/server/lib/mongodb";
import { CandidateProfile, Company } from "@/server/models/catalog.model";
import { defaultCompanyId } from "@/server/services/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;
type CompanyCoverRecord = { _id: unknown; logoUrl?: string | null; coverUrl?: string | null };
const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const POST = withAuth(async (req) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail(400, "BAD_REQUEST", "Fichier image requis (champ file).");
  if (!ALLOWED.has(file.type)) return fail(400, "UNSUPPORTED_TYPE", "Formats acceptés : JPG, PNG, WebP, GIF.");
  if (file.size > MAX_BYTES) return fail(400, "FILE_TOO_LARGE", "Image trop lourde (maximum 5 Mo).");

  await connectDB();
  const email = req.user.email.toLowerCase();
  const filename = `${req.user.id}-${Date.now()}.${EXTENSIONS[file.type]}`;
  const dir = path.join(process.cwd(), "public", "uploads", "covers");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  const url = `/uploads/covers/${filename}`;

  if (req.user.role === "COMPANY" || req.user.role === "ADMIN") {
    const preferredCompanyId = await defaultCompanyId(req.user.role, email);
    const company = preferredCompanyId
      ? await Company.findById(preferredCompanyId).lean() as unknown as CompanyCoverRecord | null
      : await Company.findOne({ $or: [{ ownerEmail: email }, { recruiterEmail: email }] }).sort({ updatedAt: -1 }).lean() as unknown as CompanyCoverRecord | null;
    if (company) {
      await Company.findByIdAndUpdate(company._id, { $set: { coverUrl: url } });
      return ok({ kind: "company", url, companyId: String(company._id) });
    }
    const created = await Company.create({
      name: email.split("@")[0]?.replace(/[._]/g, " ") || "Entreprise",
      city: "Tunisie", sector: "Recrutement", coverUrl: url,
      recruiterEmail: email, ownerEmail: email, isClaimed: true, isVerified: false,
    });
    return ok({ kind: "company", url, companyId: String(created._id) });
  }

  await CandidateProfile.updateOne(
    { email },
    {
      $set: { coverUrl: url },
      $setOnInsert: {
        email,
        fullName: email.split("@")[0]?.replace(/[._]/g, " ") || "Candidat",
        city: "Tunisie",
        headline: "",
        skills: [],
        education: [],
        experiences: [],
        languages: [],
      },
    },
    { upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  const savedProfile = await CandidateProfile.collection.findOne({ email }, { projection: { coverUrl: 1 } }) as { coverUrl?: string | null } | null;
  if (savedProfile?.coverUrl !== url) {
    return fail(500, "COVER_NOT_SAVED", "La couverture n’a pas pu être enregistrée. Réessayez.");
  }
  return ok({ kind: "candidate", url: savedProfile.coverUrl });
});
