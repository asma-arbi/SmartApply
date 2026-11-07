"use server";

import {
  listCompaniesWithJobs,
  listCompanies,
  listPublishedJobs,
  defaultCompanyId,
} from "@/server/services/catalog";
import { getOptionalServerUser } from "@/server/lib/auth-server";
import { verifyServerUser } from "@/server/lib/auth-server";
import { updateCompanyPublicContacts } from "@/server/services/catalog";

export async function listCompaniesWithJobsAction() {
  return listCompaniesWithJobs();
}

export async function publisherCompanyCatalogAction() {
  const user = await getOptionalServerUser();
  const [items, preferredCompanyId] = await Promise.all([
    listCompaniesWithJobs(),
    user ? defaultCompanyId(user.role, user.email) : Promise.resolve(null),
  ]);
  return { items, preferredCompanyId };
}

export async function listCompaniesAction() {
  return listCompanies();
}

export async function listPublishedJobsAction(companyId?: string) {
  return listPublishedJobs(companyId);
}

export async function updateCompanyPublicContactsAction(
  companyId: string,
  input: { websiteUrl: string; contactEmail: string },
) {
  const user = await verifyServerUser();
  return updateCompanyPublicContacts(user, companyId, input);
}
