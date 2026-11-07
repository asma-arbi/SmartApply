import Link from "next/link";
import { Briefcase } from "lucide-react";

export function LinkedEntities({
  companyId,
  jobId,
  companyName,
  jobTitle,
  hrefBase = "/",
}: {
  companyId?: string;
  jobId?: string;
  companyName?: string;
  jobTitle?: string;
  hrefBase?: string;
}) {
  if (!jobId && !jobTitle) return null;

  const jobParams = new URLSearchParams();
  if (companyId) jobParams.set("company", companyId);
  if (jobId) jobParams.set("job", jobId);
  const jobHref = `${hrefBase}?${jobParams.toString()}`;

  return (
    <div className="mt-4 overflow-hidden rounded-[14px] border border-[var(--sa-border)] bg-[linear-gradient(135deg,#e8f0fe_0%,#e8f0fe_100%)]">
      <div className="flex items-center gap-3 p-3.5">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[var(--sa-ink)] text-white">
          <Briefcase className="size-5" strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--sa-action)]">
            Offre liée
          </p>
          <p className="truncate text-[14px] font-semibold text-[var(--sa-text)]">
            {jobTitle || "Offre liée"}
          </p>
          {companyName ? (
            <p className="truncate text-[12px] text-[var(--sa-text-secondary)]">{companyName}</p>
          ) : null}
        </div>
        <Link
          href={jobHref}
          className="sa-btn-primary shrink-0 px-3.5 py-2 text-[12px]"
        >
          Voir
        </Link>
      </div>
    </div>
  );
}
