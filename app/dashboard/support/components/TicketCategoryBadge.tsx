import type { TicketCategory } from "@/lib/support/types";

const CATEGORY_CONFIG: Record<
  TicketCategory,
  { label: string; className: string }
> = {
  bug: { label: "🐛 Bug", className: "badge badge-red" },
  paiement: { label: "💳 Paiement", className: "badge badge-indigo" },
  compte: { label: "👤 Compte", className: "badge badge-blue" },
  autre: { label: "📂 Autre", className: "badge badge-gray" },
  non_classe: { label: "❓ Non classé", className: "badge badge-gray" },
};

export default function TicketCategoryBadge({
  category,
  aiClassified,
}: {
  category: TicketCategory;
  aiClassified?: boolean;
}) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.non_classe;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cfg.className}>{cfg.label}</span>
      {aiClassified && (
        <span className="text-[10px] text-slate-400 font-medium">✨ IA</span>
      )}
    </span>
  );
}
