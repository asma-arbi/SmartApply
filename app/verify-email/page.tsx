"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resendVerificationEmail } from "@/app/actions";

const COOLDOWN_S = 60;

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [seconds, setSeconds] = useState(0);
  const [sent, setSent] = useState(false);
  const [isPending, startTrans] = useTransition();

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 py-12">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 mb-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-lg leading-none">S</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-slate-900 font-bold text-xl tracking-tight">SmartApply</span>
              <span className="text-blue-600 text-sm font-semibold">Tunisia</span>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          {/* Mail icon */}
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-blue-100">
            <MailOpenIcon />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
            Vérifiez votre boîte mail
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-3">
            Nous avons envoyé un lien d&apos;activation sécurisé à :
          </p>

          {email && (
            <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl text-sm font-medium text-slate-800 mb-5">
              <MailIcon className="w-4 h-4 text-slate-400" />
              <span>{email}</span>
            </div>
          )}

          <p className="text-slate-500 text-xs leading-relaxed mb-6">
            Cliquez sur le lien reçu pour activer votre compte.
            <br />
            Pensez aussi à vérifier votre dossier <strong>spam / courriers indésirables</strong>.
          </p>

          {/* Success notice */}
          {sent && (
            <div
              role="alert"
              className="mb-4 flex items-center justify-center gap-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 text-xs font-medium animate-fade-in"
            >
              <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Un nouvel email d&apos;activation a été envoyé !</span>
            </div>
          )}

          {/* Resend button */}
          <button
            id="btn-resend-email"
            type="button"
            onClick={handleResend}
            disabled={seconds > 0 || isPending || !email}
            className={[
              "w-full rounded-xl py-2.5 px-4 text-sm font-medium transition-all duration-150 flex items-center justify-center gap-2",
              seconds > 0 || !email
                ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                : "btn-primary",
            ].join(" ")}
          >
            {isPending ? (
              <>
                <SpinnerIcon />
                <span>Envoi en cours…</span>
              </>
            ) : seconds > 0 ? (
              <>
                <ClockIcon className="w-4 h-4 text-slate-400" />
                <span>Renvoyer dans {seconds}s</span>
              </>
            ) : (
              <span>Renvoyer l&apos;email de confirmation</span>
            )}
          </button>

          {/* Cooldown progress bar */}
          {seconds > 0 && (
            <div className="mt-3 w-full bg-slate-100 rounded-full h-1 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-1000"
                style={{ width: `${(seconds / COOLDOWN_S) * 100}%` }}
              />
            </div>
          )}

          {/* Direct connection button */}
          <Link
            href={email ? `/login?email=${encodeURIComponent(email)}` : "/login"}
            className="w-full mt-3 rounded-xl py-2.5 px-4 text-sm font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center gap-2 transition-colors"
          >
            <span>J&apos;ai déjà confirmé mon email / Me connecter</span>
          </Link>

          {/* Dev assist box */}
          <div className="mt-4 p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-left text-xs text-amber-900">
            <p className="font-semibold flex items-center gap-1.5 text-amber-950">
              <span>💡 Mode Démonstration Supabase :</span>
            </p>
            <p className="mt-1 text-amber-800 leading-relaxed text-[11px]">
              Si aucun serveur SMTP n&apos;est connecté à Supabase, activez votre compte en 1 seconde via le SQL Editor :
            </p>
            <code className="block mt-1.5 p-2 bg-white/90 rounded-lg text-[10px] font-mono text-slate-800 border border-amber-200 select-all overflow-x-auto">
              update auth.users set email_confirmed_at = now() where email_confirmed_at is null;
            </code>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors"
            >
              <ArrowLeftIcon />
              <span>Retour à la connexion</span>
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} SmartApply Tunisia. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <SpinnerIcon />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function MailOpenIcon() {
  return (
    <svg width="24" height="24" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.2 8.4c.5.38.8.97.8 1.6v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 .8-1.6l8-6a2 2 0 0 1 2.4 0l8 6Z" />
      <path d="m22 10-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 10" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
