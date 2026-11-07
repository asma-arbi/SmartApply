import type { ReactNode } from "react";

export function CandidateHero({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[14px] bg-gradient-to-br from-[#1e40af] via-[#2563eb] to-[#3b82f6] px-6 py-6 text-white shadow-[0_12px_32px_rgba(37,99,235,0.22)] sm:px-7">
      <div className="pointer-events-none absolute -right-10 -top-16 size-40 rounded-full bg-white/12" />
      <div className="pointer-events-none absolute -bottom-14 right-20 size-32 rounded-full bg-white/8" />
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
        Espace candidat
      </p>
      <h1 className="sa-display relative mt-1.5 max-w-xl text-[26px] font-bold tracking-tight sm:text-[28px]">
        {title}
      </h1>
      <p className="relative mt-1.5 max-w-xl text-[13px] leading-5 text-white/85">{description}</p>
      {actions ? <div className="relative mt-4 flex flex-wrap gap-2">{actions}</div> : null}
    </section>
  );
}
