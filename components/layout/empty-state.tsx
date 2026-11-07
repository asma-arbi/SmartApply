import type { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="sa-card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-[14px] bg-[var(--sa-action-soft)] text-[var(--sa-action)]">
        {icon}
      </div>
      <div>
        <p className="text-[15px] font-semibold tracking-tight text-[var(--sa-text)]">{title}</p>
        {description ? (
          <p className="mt-1.5 max-w-sm text-[13px] leading-6 text-[var(--sa-text-secondary)]">
            {description}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
