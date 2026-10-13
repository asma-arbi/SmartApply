"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { resendVerificationEmail } from "@/app/actions";

const COOLDOWN_S = 60;

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [seconds, setSeconds]     = useState(0);
  const [sent, setSent]           = useState(false);
  const [isPending, startTrans]   = useTransition();

  /* Restore cooldown from localStorage */
  useEffect(() => {
    const stored = localStorage.getItem("resend_at");
    if (stored) {
      const diff = Math.ceil((Number(stored) - Date.now()) / 1000);
      if (diff > 0) setSeconds(diff);
    }
  }, []);

  /* Countdown timer */
  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => setSeconds((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [seconds]);

  function handleResend() {
    if (seconds > 0 || !email) return;
    startTrans(async () => {
      await resendVerificationEmail(email);
      const until = Date.now() + COOLDOWN_S * 1000;
      localStorage.setItem("resend_at", String(until));
      setSeconds(COOLDOWN_S);
      setSent(true);
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="card p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-100">
            <span className="text-4xl">📬</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-3">
            Vérifiez votre boîte mail
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-2">
            Nous avons envoyé un lien de confirmation à :
          </p>
          {email && (
            <p className="font-semibold text-slate-800 text-sm mb-6 bg-slate-50 rounded-xl py-2 px-4 border border-slate-200 inline-block">
              {email}
            </p>
          )}
          <p className="text-slate-400 text-xs mb-8 leading-relaxed">
            Cliquez sur le lien dans l&apos;email pour activer votre compte.
            <br />
            Vérifiez aussi votre dossier <strong>spam</strong>.
          </p>

          {/* Resend */}
          {sent && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm animate-fade-in">
              ✅ Email renvoyé avec succès !
            </div>
          )}

          <button
            id="btn-resend-email"
            type="button"
            onClick={handleResend}
            disabled={seconds > 0 || isPending || !email}
            className={[
              "w-full rounded-xl py-3 text-sm font-semibold transition-all",
              seconds > 0 || !email
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "btn-primary",
            ].join(" ")}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <SpinnerIcon /> Envoi en cours…
              </span>
            ) : seconds > 0 ? (
              `Renvoyer dans ${seconds}s`
            ) : (
              "Renvoyer l'email de confirmation"
            )}
          </button>

          {/* Cooldown progress */}
          {seconds > 0 && (
            <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-1000"
                style={{ width: `${(seconds / COOLDOWN_S) * 100}%` }}
              />
            </div>
          )}

          <p className="text-slate-400 text-xs mt-8">
            Vous ne pouvez accéder à l&apos;application qu&apos;après avoir confirmé votre email.
          </p>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mt-6">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">S</span>
          </div>
          <span className="text-slate-500 text-sm font-medium">SmartApply Tunisia</span>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50" />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
}
