"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogCompany } from "@/lib/letters-api";
import { publisherCompanyCatalogAction } from "@/server/actions/catalog.actions";

export function companyForUser(companies: CatalogCompany[], preferredId?: string) {
  if (preferredId) {
    const preferred = companies.find((item) => item.id === preferredId);
    if (preferred) return preferred;
  }
  return companies.find((item) => item.isClaimed && item.isVerified) ?? companies[0] ?? null;
}

export function useCatalogCompanies(intervalMs = 180_000) {
  const [companies, setCompanies] = useState<CatalogCompany[]>([]);
  const [preferredCompanyId, setPreferredCompanyId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let failures = 0;
    let timer: number | undefined;

    async function load(initial = false) {
      try {
        const catalog = await publisherCompanyCatalogAction();
        if (cancelled) return;
        setCompanies(catalog.items as unknown as CatalogCompany[]);
        setPreferredCompanyId(catalog.preferredCompanyId ?? undefined);
        setError("");
        failures = 0;
      } catch (err) {
        if (cancelled) return;
        failures += 1;
        if (initial) {
          setError(err instanceof Error ? err.message : "Catalogue indisponible.");
        }
      } finally {
        if (!cancelled) setLoading(false);
        if (!cancelled) {
          const delay = Math.min(intervalMs * Math.max(1, 2 ** failures), 5 * 60_000);
          timer = window.setTimeout(() => {
            void load(false);
          }, delay);
        }
      }
    }

    void load(true);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [intervalMs]);

  return { companies, loading, error, preferredCompanyId };
}

export function jobForCompany(
  company: CatalogCompany | null,
  preferredId?: string,
  category?: string,
) {
  const jobs = company?.jobs ?? [];
  if (preferredId) {
    const preferred = jobs.find((item) => item.id === preferredId);
    if (preferred) return preferred;
  }
  if (category === "PFE_ANNOUNCEMENT") {
    const pfe = jobs.find((item) => item.type === "PFE");
    if (pfe) return pfe;
  }
  if (category === "INTERNSHIP_ANNOUNCEMENT") {
    const intern = jobs.find((item) => item.type === "STAGE" || item.type === "PFE");
    if (intern) return intern;
  }
  if (category === "JOB_OPENING") {
    const job = jobs.find((item) => item.type === "CDI");
    if (job) return job;
  }
  return jobs[0] ?? null;
}

export function useMyCompany(preferredId?: string) {
  const { companies, loading, error, preferredCompanyId } = useCatalogCompanies();
  const company = useMemo(
    () => companyForUser(companies, preferredId ?? preferredCompanyId),
    [companies, preferredId, preferredCompanyId],
  );
  return { company, loading, error, companies };
}
