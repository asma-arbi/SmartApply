import type { TicketStatus } from "@/lib/support/types";

const STATUS_CONFIG: Record<
  TicketStatus,
  { label: string; className: string; dot: string }
> = {
  ouvert: {
    label: "Ouvert",
    className: "badge bg-blue-50 text-blue-700 border border-blue-200",
    dot: "bg-blue-500",
  },
  en_cours: {
    label: "En cours",
    className: "badge bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-500",
  },
  resolu: {
    label: "Résolu",
    className: "badge bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-500",
  },
  clos: {
    label: "Clos",
    className: "badge bg-slate-100 text-slate-500 border border-slate-200",
    dot: "bg-slate-400",
  },
};

export default function TicketStatusBadge({ status }: { status: TicketStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ouvert;
  return (
    <span className={cfg.className}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} inline-block mr-1.5`} />
      {cfg.label}
    </span>
  );
}
