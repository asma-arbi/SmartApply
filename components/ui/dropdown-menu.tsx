"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type DropdownMenuProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
};

export function DropdownMenu({
  trigger,
  children,
  align = "end",
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={ref} className="relative inline-flex">
      <div onClick={() => setOpen((value) => !value)}>{trigger}</div>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-40 mt-1.5 max-h-[min(70dvh,480px)] min-w-[260px] overflow-y-auto overscroll-contain rounded-[10px] border border-[var(--sa-border)] bg-white p-1 text-[var(--sa-text)] shadow-[0_8px_28px_rgba(15,23,42,0.14)]",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function DropdownMenuItem({
  className,
  destructive,
  description,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  destructive?: boolean;
  description?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        "flex w-full flex-col items-start gap-0.5 rounded-[6px] px-3 py-2.5 text-left text-sm transition-colors hover:bg-[var(--sa-hover)]",
        destructive && "text-[var(--sa-danger)] hover:bg-[var(--sa-danger-soft)]",
        className,
      )}
      {...props}
    >
      <span className="inline-flex items-center gap-2 font-semibold">{children}</span>
      {description ? (
        <span className="pl-6 text-[12px] font-normal text-[var(--sa-text-muted)]">
          {description}
        </span>
      ) : null}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-[var(--sa-divider)]" />;
}
