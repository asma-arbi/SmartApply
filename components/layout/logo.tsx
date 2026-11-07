import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  wordmark = true,
  inverted = false,
  href = "/",
}: {
  className?: string;
  wordmark?: boolean;
  inverted?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      suppressHydrationWarning
      className={cn("group inline-flex items-center gap-2", className)}
    >
      <span
        className={cn(
          "relative flex size-8 items-center justify-center overflow-hidden rounded-[8px] shadow-[0_2px_8px_rgba(37,99,235,0.28)] transition-transform duration-200 group-hover:scale-[1.03]",
          inverted ? "bg-white text-[#2563eb]" : "bg-[#2563eb] text-white",
        )}
      >
        <span
          className="absolute inset-0 opacity-70"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.28) 0%, transparent 48%), linear-gradient(225deg, #1d4ed8 0%, transparent 55%)",
          }}
        />
        <span className="relative text-[13px] font-extrabold tracking-tight">S</span>
      </span>
      {wordmark ? (
        <span
          className={cn(
            "text-[18px] font-bold tracking-[-0.03em]",
            inverted ? "text-white" : "text-[var(--sa-ink)]",
          )}
        >
          Smart
          <span className="text-[#2563eb]">Apply</span>
        </span>
      ) : (
        <span className="sr-only">{APP_NAME}</span>
      )}
    </Link>
  );
}
