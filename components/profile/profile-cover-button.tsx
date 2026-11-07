"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { uploadProfileCoverAction } from "@/server/actions/profile.actions";

export function ProfileCoverButton({ onUploaded }: { onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const result = await uploadProfileCoverAction(formData);
      onUploaded(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de l’envoi.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="absolute right-3 top-3 z-10">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(event) => void onFile(event.target.files?.[0])} />
      <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm backdrop-blur hover:bg-white disabled:opacity-70">
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Camera className="size-3.5" />}
        {busy ? "Envoi…" : "Modifier la couverture"}
      </button>
      {error ? <p role="alert" className="mt-1 max-w-56 rounded bg-white px-2 py-1 text-xs text-red-600 shadow">{error}</p> : null}
    </div>
  );
}
