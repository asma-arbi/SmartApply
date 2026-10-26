"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { register, loginWithGoogle } from "@/app/actions";

type Role = "candidat" | "entreprise";

const ERROR_MAP: Record<string, string> = {
  password_too_short: "Le mot de passe doit contenir au moins 8 caractères.",
  tos_required: "Vous devez accepter les conditions d'utilisation.",
  rate_limit: "Limite d'envoi d'emails Supabase atteinte. Pour tester librement sans confirmation, désactivez 'Confirm email' dans Supabase (Authentication > Providers > Email).",
  invalid_email: "Format d'adresse email non accepté par Supabase.",
  generic: "Une erreur est survenue lors de l'inscription. Veuillez vérifier vos données.",
};

function RegisterForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const defaultRole = (searchParams.get("role") ?? "candidat") as Role;

  const [role, setRole] = useState<Role>(defaultRole);
  const [showPwd, setShowPwd] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, startTrans] = useTransition();

  const errorMsg = errorParam ? (ERROR_MAP[errorParam] ?? ERROR_MAP.generic) : null;
  const pwdMismatch = confirm.length > 0 && password !== confirm;
  const pwdTooShort = password.length > 0 && password.length < 8;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pwdMismatch || pwdTooShort) return;
    const fd = new FormData(e.currentTarget);
    fd.set("role", role);
    startTrans(() => {
      register(fd);
    });
  }

  function handleGoogle() {
    startTrans(() => {
      loginWithGoogle();
    });
  }

  // Password strength calculation
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
        {/* Logo at top */}
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
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Créer un compte</h1>
            <p className="text-slate-500 text-sm mt-1">Rejoignez SmartApply Tunisia dès aujourd&apos;hui</p>
          </div>

          {/* Role switcher tabs : Candidat / Entreprise */}
          <div className="flex bg-slate-100/90 p-1 rounded-xl mb-6 gap-1" role="tablist">
            <button
              type="button"
              role="tab"
              id="tab-candidat"
              aria-selected={role === "candidat"}
              onClick={() => setRole("candidat")}
              className={[
                "flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5",
                role === "candidat"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Candidat</span>
            </button>
            <button
              type="button"
              role="tab"
              id="tab-entreprise"
              aria-selected={role === "entreprise"}
              onClick={() => setRole("entreprise")}
              className={[
                "flex-1 py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center gap-1.5",
                role === "entreprise"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800",
              ].join(" ")}
            >
              <BuildingIcon className="w-3.5 h-3.5" />
              <span>Entreprise</span>
            </button>
          </div>


          {/* Error alert */}
          {errorMsg && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm animate-fade-in"
            >
              <AlertCircleIcon className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google signup (candidat only) */}
          {role === "candidat" && (
            <>
              <button
                id="btn-google-register"
                type="button"
                onClick={handleGoogle}
                disabled={isPending}
                className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl py-2.5 px-4 text-sm font-medium transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 mb-5"
              >
                <GoogleIcon />
                <span>Continuer avec Google</span>
              </button>

              <div className="relative mb-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-slate-400 font-medium">
                    ou avec votre email
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} id="register-form" className="space-y-4">
            <input type="hidden" name="role" value={role} />

            {/* Full Name */}
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Nom complet
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="reg-name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Ahmed Ben Ali"
                  className="input-field has-left-icon"
                />
              </div>
            </div>

            {/* Company Name (entreprise only) */}
            {role === "entreprise" && (
              <div>
                <label htmlFor="reg-company" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nom de l&apos;entreprise
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <BuildingIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-company"
                    name="company_name"
                    type="text"
                    required
                    placeholder="InstaDeep, Telnet…"
                    className="input-field has-left-icon"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Email {role === "entreprise" && <span className="text-slate-400 normal-case font-normal">(professionnel)</span>}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MailIcon className="w-4 h-4" />
                </div>
                <input
                  id="reg-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder={role === "entreprise" ? "contact@entreprise.tn" : "ahmed@exemple.com"}
                  className="input-field has-left-icon"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="reg-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <LockIcon className="w-4 h-4" />
                </div>
                <input
                  id="reg-password"
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
              <label htmlFor="reg-confirm" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <LockIcon className="w-4 h-4" />
                </div>
                <input
                  id="reg-confirm"
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

            {/* Consents */}
            <div className="pt-3 space-y-3 border-t border-slate-100">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  id="reg-tos"
                  name="tos"
                  type="checkbox"
                  required
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0 cursor-pointer"
                />
                <span className="text-xs text-slate-500 leading-relaxed">
                  J&apos;accepte les{" "}
                  <a href="/terms" target="_blank" className="text-blue-600 hover:text-blue-700 font-medium underline-offset-2 hover:underline">
                    conditions d&apos;utilisation
                  </a>{" "}
                  et la{" "}
                  <a href="/privacy" target="_blank" className="text-blue-600 hover:text-blue-700 font-medium underline-offset-2 hover:underline">
                    politique de confidentialité
                  </a>{" "}
                  (v1.0)
                  <span className="ml-0.5 text-red-500">*</span>
                </span>
              </label>

              {role === "candidat" && (
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    id="reg-ai-cv"
                    name="ai_cv"
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0 cursor-pointer"
                  />
                  <span className="text-xs text-slate-500 leading-relaxed">
                    <span className="font-medium text-slate-700">Traitement IA du CV</span> — J&apos;autorise SmartApply à analyser
                    mon CV par IA pour générer des candidatures personnalisées.{" "}
                    <span className="text-slate-400">(optionnel)</span>
                  </span>
                </label>
              )}
            </div>

            {/* Submit */}
            <button
              id="btn-register-submit"
              type="submit"
              disabled={isPending || !!pwdMismatch || !!pwdTooShort}
              className="btn-primary w-full mt-2"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <SpinnerIcon /> Inscription en cours…
                </span>
              ) : role === "entreprise" ? (
                "Créer le compte entreprise"
              ) : (
                "Créer mon compte"
              )}
            </button>
          </form>

          {/* Link to login */}
          <p className="text-center text-sm text-slate-500 mt-6">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold transition-colors">
              Se connecter
            </Link>
          </p>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} SmartApply Tunisia. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <SpinnerIcon />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

/* ── Inline SVG Icons ──────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
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

function LockIcon({ className }: { className?: string }) {
  return (
    <svg width="16" height="16" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

