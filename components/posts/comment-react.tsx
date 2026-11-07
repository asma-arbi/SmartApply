"use client";

import { useEffect, useRef, useState } from "react";
import { REACTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ReactionType } from "@/types/post";

type CommentReactProps = {
  liked: boolean;
  reaction: ReactionType | null;
  likes: number;
  disabled?: boolean;
  onReact: (type: ReactionType) => void | Promise<void>;
};

export function CommentReact({ liked, reaction, likes, disabled, onReact }: CommentReactProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = REACTIONS.find((item) => item.type === reaction) ?? REACTIONS[0];

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  if (disabled) {
    return null;
  }

  return (
    <div ref={ref} className="relative">
      {open ? (
        <div className="absolute bottom-[calc(100%+6px)] left-0 z-20 flex items-center gap-0.5 rounded-full border border-border bg-card px-1.5 py-1 shadow-lg">
          {REACTIONS.map((item) => (
            <button
              key={item.type}
              type="button"
              title={item.label}
              className={cn(
                "rounded-full px-1 text-base leading-none transition-transform hover:-translate-y-0.5",
                reaction === item.type && "scale-125",
              )}
              onClick={() => {
                void onReact(item.type);
                setOpen(false);
              }}
            >
              {item.emoji}
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
          liked && current.className,
        )}
      >
        {liked ? <span>{current.emoji}</span> : null}
        <span>{liked ? current.label : "Réagir"}</span>
      </button>
    </div>
  );
}
