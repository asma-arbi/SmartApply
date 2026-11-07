"use client";

import { useEffect, useState } from "react";
import { formatDate, formatRelativeDate } from "@/lib/format";

export function RelativeTime({ iso }: { iso: string }) {
  const [label, setLabel] = useState(() => formatDate(iso));

  useEffect(() => {
    setLabel(formatRelativeDate(iso));
  }, [iso]);

  return <time dateTime={iso}>{label}</time>;
}
