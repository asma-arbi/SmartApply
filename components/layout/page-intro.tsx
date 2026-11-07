import type { ReactNode } from "react";

export function PageIntro({
  kicker,
  title,
  description,
  action,
}: {
  kicker?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {kicker ? (
          <p className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            {kicker}
          </p>
        ) : null}
        <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 self-start">{action}</div> : null}
    </div>
  );
}
