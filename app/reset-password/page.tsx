"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { resetPassword } from "@/app/actions";

const ERROR_MAP: Record<string, string> = {
  password_too_short: "Le mot de passe doit contenir au moins 8 caractères.",
  generic: "Une erreur est survenue. Veuillez réessayer.",
};

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const errorParam   = searchParams.get("error");

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [isPending, startTrans]   = useTransition();

  const errorMsg = errorParam ? (ERROR_MAP[errorParam] ?? ERROR_MAP.generic) : null;
  const pwdTooShort  = password.length > 0 && password.length < 8;
  const pwdMismatch  = confirm.length > 0 && password !== confirm;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pwdTooShort || pwdMismatch) return;
    const fd = new FormData(e.currentTarget);
    startTrans(() => { resetPassword(fd); });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <span className="text-white font-black">S</span>
          </div>
          <div>
            <p className="text-slate-900 font-bold leading-none">SmartApply</p>
            <p className="text-blue-600 text-xs">Tunisia</p>
          </div>
        </div>

        <div className="card p-8">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 border border-blue-100">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Nouveau mot de passe</h1>
          <p className="text-slate-500 text-sm mb-6">
            Choisissez un mot de passe sécurisé d&apos;au moins 8 caractères.
          </p>

          {errorMsg && (
            <div role="alert"
                 className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-fade-in">
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} id="reset-password-form" className="space-y-4">
            {/* New password */}
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  name="password"
                  type={showPwd ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="8 caractères minimum"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={["input-field pr-12", pwdTooShort ? "border-red-300" : ""].join(" ")}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  aria-label={showPwd ? "Masquer" : "Afficher"}
                >
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {pwdTooShort && (
                <p className="mt-1 text-xs text-red-500">Minimum 8 caractères requis.</p>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Confirmer le mot de passe
              </label>
              <input
                id="confirm-password"
                name="confirm_password"
                type={showPwd ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={["input-field", pwdMismatch ? "border-red-300" : ""].join(" ")}
              />
              {pwdMismatch && (
                <p className="mt-1 text-xs text-red-500">Les mots de passe ne correspondent pas.</p>
              )}
            </div>

            <button
              id="btn-reset-submit"
              type="submit"
              disabled={isPending || pwdTooShort || pwdMismatch}
              className="btn-primary w-full"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <SpinnerIcon /> Enregistrement…
                </span>
              ) : "Enregistrer le nouveau mot de passe"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-400 mt-6">
          <Link href="/login" className="hover:text-blue-600 transition-colors">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function EyeIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function EyeOffIcon() {
  return <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}
function SpinnerIcon() {
  return <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>;
}
