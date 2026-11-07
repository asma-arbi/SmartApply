"use client";

import { useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";

type AvatarProps = {
  name: string;
  initials: string;
  src?: string | null;
  className?: string;
  style?: CSSProperties;
};

export function Avatar({ name, initials, src, className, style }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  return (
    <div
      title={name}
      style={style}
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2563eb]/15 text-[11px] font-semibold tracking-wide text-[#2563eb]",
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={name}
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="relative z-[1]">{initials}</span>
      )}
    </div>
  );
}
