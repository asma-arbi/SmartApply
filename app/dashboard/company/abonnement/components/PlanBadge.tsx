import type { BillingPlan } from "@/lib/billing/types";

interface PlanBadgeProps {
  plan: BillingPlan;
  size?: "sm" | "md";
}

export default function PlanBadge({ plan, size = "md" }: PlanBadgeProps) {
  const isSmall = size === "sm";

  if (plan === "pro") {
    return (
      <span
        className={`inline-flex items-center gap-1 font-bold rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white ${
          isSmall ? "text-xs px-2.5 py-0.5" : "text-sm px-3.5 py-1"
        }`}
        aria-label="Plan Pro"
      >
        ⭐ Pro
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full bg-slate-100 text-slate-600 ${
        isSmall ? "text-xs px-2.5 py-0.5" : "text-sm px-3.5 py-1"
      }`}
      aria-label="Plan Gratuit"
    >
      Gratuit
    </span>
  );
}
