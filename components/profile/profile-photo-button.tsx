"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadProfileAvatarAction } from "@/server/actions/profile.actions";
import { cn } from "@/lib/utils";

export function ProfilePhotoButton({
  onUploaded,
  className,
}: {
  onUploaded: (url: string) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const data = await uploadProfileAvatarAction(formData);
      if (data.url) {
        onUploaded(data.url);
        window.dispatchEvent(new Event("smartapply:avatar-updated"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec upload.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={busy}
        title="Ajouter une photo"
        aria-label="Ajouter une photo de profil"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          inputRef.current?.click();
        }}
        className="inline-flex size-7 items-center justify-center rounded-full border border-white bg-[#2563eb] text-white shadow-md transition-colors hover:bg-[#1d4ed8] disabled:opacity-70"
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Camera className="size-3.5" strokeWidth={2} />
        )}
      </button>
      {error ? (
        <p className="absolute left-0 top-8 z-10 w-48 rounded-md bg-white px-2 py-1 text-[10px] font-medium text-red-600 shadow">
          {error}
        </p>
      ) : null}
    </div>
  );
}
