import type { StripeSubscriptionStatus } from "@/lib/billing/types";

interface StatusBadgeProps {
  status: StripeSubscriptionStatus | null;
  cancelAtPeriodEnd?: boolean;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: string }
> = {
  active: {
    label: "Actif",
    className: "badge-green",
    icon: "✓",
  },
  trialing: {
    label: "Période d'essai",
    className: "badge-blue",
    icon: "⏱",
  },
  past_due: {
    label: "Paiement échoué",
    className: "badge-red",
    icon: "⚠",
  },
  canceled: {
    label: "Annulé",
    className: "badge-gray",
    icon: "✗",
  },
  unpaid: {
    label: "Impayé",
    className: "badge-red",
    icon: "⚠",
  },
  incomplete: {
    label: "Incomplet",
    className: "badge-yellow",
    icon: "⏳",
  },
  incomplete_expired: {
    label: "Expiré",
    className: "badge-gray",
    icon: "✗",
  },
  paused: {
    label: "Suspendu",
    className: "badge-yellow",
    icon: "⏸",
  },
};

export default function StatusBadge({ status, cancelAtPeriodEnd }: StatusBadgeProps) {
  if (!status) return null;

  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "badge-gray",
    icon: "·",
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={config.className} aria-label={`Statut : ${config.label}`}>
        {config.icon} {config.label}
      </span>
      {cancelAtPeriodEnd && status === "active" && (
        <span className="badge-yellow" aria-label="Résiliation programmée">
          ⚡ Résiliation en fin de période
        </span>
      )}
    </span>
  );
}
