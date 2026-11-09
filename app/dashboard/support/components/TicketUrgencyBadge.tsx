import type { TicketUrgency } from "@/lib/support/types";

const URGENCY_CONFIG: Record<
  TicketUrgency,
  { label: string; className: string }
> = {
  haute: {
    label: "🔴 Haute",
    className: "badge bg-red-50 text-red-700 border border-red-200 font-semibold",
  },
  moyenne: {
    label: "🟡 Moyenne",
    className: "badge bg-amber-50 text-amber-700 border border-amber-200",
  },
  basse: {
    label: "🟢 Basse",
    className: "badge bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
};

export default function TicketUrgencyBadge({
  urgency,
}: {
  urgency: TicketUrgency | null;
}) {
  if (!urgency) return <span className="badge badge-gray">—</span>;
  const cfg = URGENCY_CONFIG[urgency];
  return <span className={cfg.className}>{cfg.label}</span>;
}
