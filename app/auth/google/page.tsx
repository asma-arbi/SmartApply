"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const SUGGESTED_ACCOUNTS = [
  {
    name: "Asma Arbi",
    email: "asma.arbi@esprit.tn",
    avatar: "A",
    color: "bg-blue-600",
  },
  {
    name: "Asma Arbi",
    email: "asmaarbi27@gmail.com",
    avatar: "A",
    color: "bg-purple-600",
  },
];

export default function GoogleAccountChooserPage() {
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"candidat" | "entreprise">("candidat");
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search);
      const r = q.get("role");
      if (r === "entreprise") setSelectedRole("entreprise");
    }
  }, []);

  function handleSelectAccount(email: string, name?: string) {
    setLoadingEmail(email);
    // Navigation complète du navigateur vers le point d'authentification
    const params = new URLSearchParams({
      email,
      name: name || email.split("@")[0],
      role: selectedRole,
    });
    window.location.href = `/api/auth/google?${params.toString()}`;
  }

  function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!customEmail || !customEmail.includes("@")) return;
    handleSelectAccount(customEmail, customName || customEmail.split("@")[0]);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-lg p-8 animate-slide-up">
        {/* Google Logo */}
        <div className="flex flex-col items-center mb-6">
          <svg className="w-10 h-10 mb-3" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <h1 className="text-xl font-bold text-slate-900">Connexion avec Google</h1>
          <p className="text-slate-500 text-xs mt-1 text-center">
            Choisissez un compte pour continuer vers{" "}
            <span className="font-semibold text-slate-800">SmartApply Tunisia</span>
          </p>
        </div>

        {/* Role selector */}
        <div className="mb-5 bg-slate-100 p-1 rounded-xl flex gap-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setSelectedRole("candidat")}
            className={[
              "flex-1 py-1.5 rounded-lg transition-all",
              selectedRole === "candidat"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            Espace Candidat
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole("entreprise")}
            className={[
              "flex-1 py-1.5 rounded-lg transition-all",
              selectedRole === "entreprise"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            ].join(" ")}
          >
            Espace Entreprise
          </button>
        </div>

        {/* Account list */}
        <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden mb-5">
          {SUGGESTED_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              disabled={!!loadingEmail}
              onClick={() => handleSelectAccount(acc.email, acc.name)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full ${acc.color} text-white font-bold text-sm flex items-center justify-center flex-shrink-0`}
                >
                  {acc.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {acc.name}
                  </p>
                  <p className="text-xs text-slate-500">{acc.email}</p>
                </div>
              </div>
              {loadingEmail === acc.email ? (
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-slate-300 group-hover:text-blue-600 font-bold">→</span>
              )}
            </button>
          ))}

          {/* Option: Utiliser un autre compte */}
          {!showCustom ? (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left text-xs font-semibold text-slate-700"
            >
              <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-base font-bold">
                +
              </div>
              <span>Utiliser un autre compte Google</span>
            </button>
          ) : (
            <form onSubmit={handleCustomSubmit} className="p-4 bg-slate-50/50 space-y-3">
              <p className="text-xs font-bold text-slate-800">
                Saisir un autre compte Google
              </p>
              <div>
                <input
                  type="email"
                  required
                  placeholder="nom@gmail.com"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Votre nom complet (optionnel)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!customEmail || !!loadingEmail}
                  className="btn-primary text-xs py-2 px-4 flex-1"
                >
                  Continuer avec ce compte
                </button>
                <button
                  type="button"
                  onClick={() => setShowCustom(false)}
                  className="btn-secondary text-xs py-2 px-3"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          Pour continuer, Google partagera votre nom, votre adresse e-mail et vos préférences de langue avec SmartApply Tunisia.
        </p>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <Link
            href="/login"
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            ← Revenir à la page de connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
