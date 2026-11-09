interface UsageGaugeProps {
  current: number;
  max: number;
  label?: string;
}

export default function UsageGauge({
  current,
  max,
  label = "Offres publiées",
}: UsageGaugeProps) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  const barColor =
    pct >= 100
      ? "bg-red-500"
      : pct >= 70
      ? "bg-amber-500"
      : "bg-emerald-500";

  const textColor =
    pct >= 100
      ? "text-red-600"
      : pct >= 70
      ? "text-amber-600"
      : "text-emerald-600";

  return (
    <div className="space-y-2" role="group" aria-label={label}>
      <div className="flex justify-between items-center text-sm">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className={`font-bold tabular-nums ${textColor}`}>
          {current} / {max}
        </span>
      </div>
      <div
        className="w-full h-3 bg-slate-100 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${current} sur ${max} offres publiées`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {pct >= 100 && (
        <p className="text-xs text-red-600 font-medium">
          Limite atteinte — passez au plan Pro pour publier des offres illimitées.
        </p>
      )}
    </div>
  );
}
