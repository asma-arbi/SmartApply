"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { resetPassword } from "@/app/actions";

const ERROR_MAP: Record<string, string> = {
  password_too_short: "Le mot de passe doit contenir au moins 8 caractères.",
  generic: "Une erreur est survenue lors de la réinitialisation. Veuillez réessayer.",
};

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [isPending, startTrans] = useTransition();

  const errorMsg = errorParam ? (ERROR_MAP[errorParam] ?? ERROR_MAP.generic) : null;
  const pwdTooShort = password.length > 0 && password.length < 8;
  const pwdMismatch = confirm.length > 0 && password !== confirm;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pwdTooShort || pwdMismatch) return;
    const fd = new FormData(e.currentTarget);
    startTrans(() => {
      resetPassword(fd);
    });
  }

  const getStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getStrength(password);

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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-5 border border-blue-100">
            <ShieldLockIcon />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Nouveau mot de passe</h1>
          <p className="text-slate-500 text-sm mb-6">
            Choisissez un mot de passe sécurisé d&apos;au moins 8 caractères pour votre compte.
          </p>

          {errorMsg && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm animate-fade-in"
            >
              <AlertCircleIcon className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} id="reset-password-form" className="space-y-4">
            {/* New Password */}
            <div>
              <label htmlFor="new-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <LockIcon />
                </div>
                <input
                  id="new-password"
                  name="password"
                  type={showPwd ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="8 caractères minimum"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={[
                    "input-field has-left-icon has-right-icon",
                    pwdTooShort ? "border-red-300 focus:border-red-400 focus:ring-red-400/20" : "",
                  ].join(" ")}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>

              {pwdTooShort && (
                <p className="mt-1 text-xs text-red-500 font-medium">8 caractères minimum requis.</p>
              )}

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={[
                          "h-1 flex-1 rounded-full transition-all duration-300",
                          step <= strength
                            ? strength <= 1
                              ? "bg-red-500"
                              : strength <= 2
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                            : "bg-slate-100",
                        ].join(" ")}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Force du mot de passe</span>
                    <span className="font-medium text-slate-600">
                      {strength <= 1 ? "Faible" : strength <= 2 ? "Moyen" : strength === 3 ? "Bon" : "Très fort"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <LockIcon />
                </div>
                <input
                  id="confirm-password"
                  name="confirm_password"
                  type={showPwd ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={[
                    "input-field has-left-icon",
                    pwdMismatch ? "border-red-300 focus:border-red-400 focus:ring-red-400/20" : "",
                  ].join(" ")}
                />
              </div>
              {pwdMismatch && (
                <p className="mt-1 text-xs text-red-500 font-medium">Les mots de passe ne correspondent pas.</p>
              )}
            </div>

            <button
              id="btn-reset-submit"
              type="submit"
              disabled={isPending || pwdTooShort || pwdMismatch}
              className="btn-primary w-full mt-2"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <SpinnerIcon /> Enregistrement…
                </span>
              ) : (
                "Enregistrer le nouveau mot de passe"
              )}
            </button>
          </form>

          <div className="pt-6 mt-6 border-t border-slate-100 text-center">
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <SpinnerIcon />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

function LockIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ShieldLockIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <rect width="8" height="5" x="8" y="11" rx="1" />
      <path d="M10 11V9a2 2 0 1 1 4 0v2" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}
