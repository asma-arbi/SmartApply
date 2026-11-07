"use client";

import { FEED_CATEGORY_CHIPS } from "@/lib/constants";
import type { PostCategory } from "@/types/post";
import { cn } from "@/lib/utils";

export function FeedCategoryChips({
  value,
  onChange,
}: {
  value: PostCategory | "tous";
  onChange: (value: PostCategory | "tous") => void;
}) {
  return (
    <div className="flex gap-1.5 overflow-x-auto px-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {FEED_CATEGORY_CHIPS.map((chip) => {
        const active = value === chip.value;
        return (
          <button
            key={chip.value}
            type="button"
            onClick={() => onChange(chip.value)}
            className={cn(
              "sa-chip shrink-0 whitespace-nowrap border text-[12.5px]",
              active
                ? "sa-chip-active border-transparent"
                : "border-[rgba(15,23,42,0.12)] bg-white/90 text-[var(--sa-text-secondary)] hover:border-[#2563eb]/35 hover:bg-[#eff5ff] hover:text-[#2563eb]",
            )}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
