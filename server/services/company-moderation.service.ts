import { connectDB } from "@/server/lib/mongodb";
import { CompanyReport } from "@/server/models/engagement.model";
import { Company } from "@/server/models/catalog.model";
import { User } from "@/server/models/user.model";
import type { AuthUser } from "@/server/middleware/auth";
import type { ReportReason } from "@/server/models/engagement.model";
import { NotFoundError, ValidationError } from "@/server/lib/errors";

export async function reportCompany(user: AuthUser, companyId: string, reason: ReportReason, details?: string) {
  await connectDB();
  if (!companyId.trim()) throw new ValidationError("Entreprise invalide.");
  if (!await Company.exists({ _id: companyId })) throw new NotFoundError("Entreprise introuvable.");
  const existing = await CompanyReport.findOne({ companyId, reporterId: user.id }).lean();
  if (existing) throw new ValidationError("Vous avez déjà signalé cette entreprise.");
  const report = await CompanyReport.create({
    companyId,
    reporterId: user.id,
    reason,
    details: details?.trim().slice(0, 2000) || null,
  });
  return { id: String(report._id), status: report.status };
}

export async function listCompanyReports(status?: "PENDING" | "DISMISSED" | "ACTIONED") {
  await connectDB();
  const query = status ? { status } : {};
  const rows = await CompanyReport.find(query).sort({ createdAt: -1 }).limit(200).lean() as unknown as Array<{
    _id: unknown; companyId: string; reporterId: string; reason: string; details: string | null;
    status: "PENDING" | "DISMISSED" | "ACTIONED"; createdAt: Date;
  }>;
  const companyIds = [...new Set(rows.map((row) => row.companyId))];
  const reporterIds = [...new Set(rows.map((row) => row.reporterId))];
  const [companyDocs, reporterDocs] = await Promise.all([
    Company.find({ _id: { $in: companyIds } }).select("_id name").lean(),
    User.find({ _id: { $in: reporterIds } }).select("_id email name").lean(),
  ]);
  const companies = companyDocs as unknown as Array<{ _id: unknown; name: string }>;
  const reporters = reporterDocs as unknown as Array<{ _id: unknown; email: string; name?: string }>;
  const companyMap = new Map(companies.map((row) => [String(row._id), row.name]));
  const reporterMap = new Map(reporters.map((row) => [String(row._id), row.name || row.email]));
  return rows.map((row) => ({
    id: String(row._id), companyId: row.companyId, companyName: companyMap.get(row.companyId) ?? "Entreprise supprimée",
    reporterName: reporterMap.get(row.reporterId) ?? "Membre", reason: row.reason,
    details: row.details, status: row.status, createdAt: row.createdAt.toISOString(),
  }));
}

export async function reviewCompanyReport(admin: AuthUser, reportId: string, status: "DISMISSED" | "ACTIONED", reviewNote?: string) {
  await connectDB();
  const report = await CompanyReport.findById(reportId).lean() as unknown as { status: string } | null;
  if (!report) throw new NotFoundError("Signalement introuvable.");
  if (report.status !== "PENDING") throw new ValidationError("Ce signalement a déjà été traité.");
  const updated = await CompanyReport.findByIdAndUpdate(reportId, {
    $set: { status, reviewedById: admin.id, reviewedAt: new Date(), reviewNote: reviewNote?.trim().slice(0, 1000) || null },
  }, { new: true }).lean() as unknown as { _id: unknown; status: string } | null;
  if (!updated) throw new NotFoundError("Signalement introuvable.");
  return { id: String(updated._id), status: updated.status };
}
