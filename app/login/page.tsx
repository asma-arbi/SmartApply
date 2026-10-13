"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { login, loginWithGoogle } from "@/app/actions";

/* ── Inner component (needs useSearchParams) ─────────────── */
function LoginForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const msgParam   = searchParams.get("msg");

  const [showPwd, setShowPwd]     = useState(false);
  const [isPending, startTrans]   = useTransition();

  const errorMsg =
    errorParam === "locked"
      ? "Compte temporairement bloqué après plusieurs tentatives. Réessayez dans quelques minutes."
      : errorParam
      ? "Identifiants invalides. Veuillez réessayer."
      : null;

  const successMsg =
    msgParam === "password_reset"
      ? "Mot de passe modifié avec succès. Vous pouvez vous connecter."
      : msgParam === "confirm"
      ? "Compte créé ! Vérifiez votre boîte mail avant de vous connecter."
      : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTrans(() => { login(fd); });
  }

  function handleGoogle() {
    startTrans(() => { loginWithGoogle(); });
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ── Left decorative panel ─────────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12"
           style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e1b4b 100%)" }}>
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
             style={{
               backgroundImage: "linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px)",
               backgroundSize: "40px 40px",
             }} />
        {/* Glow blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl"
             style={{ background: "rgba(59,130,246,0.15)", transform: "translate(40%,-40%)" }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl"
             style={{ background: "rgba(99,102,241,0.15)", transform: "translate(-40%,40%)" }} />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-14">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30">
              <span className="text-white font-black text-lg">S</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none">SmartApply</p>
              <p className="text-blue-400 text-xs leading-none mt-0.5">Tunisia</p>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Votre carrière IT<br />commence ici 🚀
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-10">
            Transformez votre CV en candidatures ciblées grâce à l&apos;intelligence artificielle.
          </p>

          <div className="space-y-4">
            {[
              { icon: "🎯", text: "Candidatures automatiques et personnalisées" },
              { icon: "🤖", text: "IA qui analyse et optimise votre profil" },
              { icon: "🏢", text: "500+ entreprises IT tunisiennes partenaires" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <span className="text-xl">{f.icon}</span>
                <span className="text-slate-300 text-sm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="relative z-10 grid grid-cols-3 gap-6 pt-8 border-t border-white/10">
          {[
            { value: "2 400+", label: "Offres actives" },
            { value: "500+",   label: "Entreprises IT" },
            { value: "12 k+",  label: "Candidats" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: login form ─────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[420px] animate-slide-up">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-black">S</span>
            </div>
            <div>
              <p className="text-slate-900 font-bold leading-none">SmartApply</p>
              <p className="text-blue-600 text-xs">Tunisia</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Bienvenue 👋</h2>
            <p className="text-slate-500 text-sm mt-1">Connectez-vous à votre compte SmartApply</p>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div role="alert"
                 className="mb-5 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-fade-in">
              <span className="flex-shrink-0 text-base">⚠️</span>
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div role="alert"
                 className="mb-5 flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm animate-fade-in">
              <span className="flex-shrink-0 text-base">✅</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google OAuth */}
          <button
            id="btn-google-login"
            type="button"
            onClick={handleGoogle}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl py-3 px-4 text-sm font-medium transition-all shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50 mb-5"
          >
            <GoogleIcon />
            Continuer avec Google
          </button>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-50 px-4 text-xs text-slate-400">ou avec votre email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="vous@exemple.com"
                className="input-field"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                  Mot de passe
                </label>
                <Link href="/forgot-password"
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPwd ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="input-field pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded"
                  aria-label={showPwd ? "Masquer" : "Afficher"}
                >
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={isPending}
              className="btn-primary w-full"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <SpinnerIcon /> Connexion…
                </span>
              ) : "Se connecter"}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Pas encore de compte ?{" "}
            <Link href="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
              Créer un compte
            </Link>
          </p>

          {/* Language toggle */}
          <div className="flex justify-center gap-3 mt-8">
            <button className="text-sm font-semibold text-blue-600">FR</button>
            <span className="text-slate-300">|</span>
            <button className="text-sm text-slate-400 hover:text-slate-600 transition-colors">EN</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><SpinnerIcon /></div>}>
      <LoginForm />
    </Suspense>
  );
}

/* ── SVG Icons ─────────────────────────────────────────────── */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
function EyeIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
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
