"use client";

import { cn } from "@/lib/utils";

type Tab<T extends string> = {
  value: T;
  label: string;
};

type TabsProps<T extends string> = {
  tabs: Tab<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
  variant?: "pills" | "segmented";
};

export function Tabs<T extends string>({
  tabs,
  value,
  onValueChange,
  className,
  variant = "pills",
}: TabsProps<T>) {
  if (variant === "segmented") {
    return (
      <div
        role="tablist"
        className={cn(
          "inline-flex w-full flex-nowrap overflow-x-auto rounded-xl bg-muted p-1 sm:w-auto",
          className,
        )}
      >
        {tabs.map((tab) => {
          const active = tab.value === value;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onValueChange(tab.value)}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div role="tablist" className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium transition-colors sm:px-3 sm:text-sm",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
