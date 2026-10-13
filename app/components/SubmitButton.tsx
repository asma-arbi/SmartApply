"use client";

import { useFormStatus } from "react-dom";

interface Props {
  children: React.ReactNode;
  className?: string;
  loadingText?: string;
  id?: string;
}

export default function SubmitButton({
  children,
  className = "btn-primary w-full",
  loadingText = "Chargement…",
  id,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={className} id={id}>
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <svg
            className="w-4 h-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
