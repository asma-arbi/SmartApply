"use server";

import { requireRole } from "@/server/lib/auth-server";
import {
  listReports,
  moderatePost,
  reviewReport,
  type ModerationAction,
} from "@/server/services/moderation.service";
import { listCompanyReports, reviewCompanyReport } from "@/server/services/company-moderation.service";

export async function listReportsAction(
  status?: "PENDING" | "DISMISSED" | "ACTIONED",
  page = 1,
  limit = 20,
) {
  await requireRole(["ADMIN"]);
  return listReports(status, page, limit);
}

export async function moderatePostAction(postId: string, action: ModerationAction, reason: string) {
  const admin = await requireRole(["ADMIN"]);
  return moderatePost(admin, postId, action, reason);
}

export async function reviewReportAction(
  reportId: string,
  status: "DISMISSED" | "ACTIONED",
  reviewNote?: string,
  action?: ModerationAction,
) {
  const admin = await requireRole(["ADMIN"]);
  return reviewReport(admin, reportId, status, reviewNote, action);
}

export async function listCompanyReportsAction(status?: "PENDING" | "DISMISSED" | "ACTIONED") {
  await requireRole(["ADMIN"]);
  return listCompanyReports(status);
}

export async function reviewCompanyReportAction(reportId: string, status: "DISMISSED" | "ACTIONED", reviewNote?: string) {
  const admin = await requireRole(["ADMIN"]);
  return reviewCompanyReport(admin, reportId, status, reviewNote);
}
