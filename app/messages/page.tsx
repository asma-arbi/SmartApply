import { Suspense } from "react";
import { MessagesPage } from "@/components/messages/messages-page";

export default function MessagesRoute() {
  return <Suspense fallback={<div className="mx-auto max-w-4xl p-8">Chargement…</div>}><MessagesPage /></Suspense>;
}
