"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  updateCandidateProfile,
  updatePassword,
  revokeSessionAction,
  revokeAllOtherSessionsAction,
} from "@/app/actions";
import { Profile } from "@/lib/models/types";

interface SessionItem {
  id: string;
  deviceName: string;
  ip: string;
  created_at: string;
  last_active_at: string;
  isCurrent: boolean;
}

interface CandidateSettingsClientProps {
  user: {
    id: string;
    name: string;
    email: string;
    auth_provider: string;
  };
  profile: Profile;
  sessions: SessionItem[];
  initialTab: string;
  successParam?: string;
  errorParam?: string;
}

export default function CandidateSettingsClient({
  user,
  profile,
  sessions,
  initialTab,
  successParam,
  errorParam,
}: CandidateSettingsClientProps) {
  const [tab, setTab] = useState<"profile" | "sessions" | "password" | "rgpd">(
    initialTab === "sessions" || initialTab === "security"
      ? "sessions"
      : initialTab === "password"
      ? "password"
      : initialTab === "rgpd"
      ? "rgpd"
      : "profile"
  );
  const [isPending, startTrans] = useTransition();

  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Profile skills string state
  const [skillsStr, setSkillsStr] = useState(
    Array.isArray(profile.skills) ? profile.skills.join(", ") : ""
  );

  // Generate strong password
  function handleGeneratePassword() {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*";
    let pwd = "";
    pwd += "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)];
    pwd += "abcdefghjkmnpqrstuvwxyz"[Math.floor(Math.random() * 24)];
    pwd += "23456789"[Math.floor(Math.random() * 8)];
    pwd += "!@#$%&*"[Math.floor(Math.random() * 7)];
    for (let i = 4; i < 14; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    const shuffled = pwd.split("").sort(() => 0.5 - Math.random()).join("");
    setNewPassword(shuffled);
    setConfirmPassword(shuffled);
    setShowPassword(true);
  }

  // Export RGPD Data
  function handleExportData() {
    const dataToExport = {
      compte: {
        id: user.id,
        nom: user.name,
        email: user.email,
        auth_provider: user.auth_provider,
      },
      profil_candidat: profile,
      sessions_actives: sessions.map((s) => ({
        appareil: s.deviceName,
        ip: s.ip,
        derniere_activite: s.last_active_at,
        creee_le: s.created_at,
      })),
      date_export: new Date().toISOString(),
      conformite: "RGPD & Protection des données personnelles (SmartApply Tunisia)",
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smartapply-donnees-candidat-${user.email.split("@")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* ── En-tête ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Espace Candidat
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Mon Profil & Paramètres du Compte
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Gérez vos informations professionnelles, votre visibilité recruteurs et la sécurité de vos sessions.
          </p>
        </div>

        <Link
          href="/dashboard/candidate"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          ← Retour à l&apos;accueil
        </Link>
      </div>

      {/* ── Alertes de succès / erreur ───────────────────────────── */}
      {successParam && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs sm:text-sm flex items-center gap-2 animate-fade-in">
          <span className="text-base">✅</span>
          <span>
            {successParam === "profile_updated"
              ? "Votre profil candidat a été mis à jour avec succès !"
              : successParam === "password_updated"
              ? "Votre mot de passe a été modifié avec succès. Les autres sessions ont été révoquées."
              : "Opération effectuée avec succès."}
          </span>
        </div>
      )}

      {errorParam && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-xs sm:text-sm flex items-center gap-2 animate-fade-in">
          <span className="text-base">⚠️</span>
          <span>
            {errorParam === "invalid_current_password"
              ? "Le mot de passe actuel est incorrect."
              : errorParam === "password_mismatch"
              ? "Les deux nouveaux mots de passe ne correspondent pas."
              : errorParam === "password_too_short"
              ? "Le mot de passe doit comporter au moins 8 caractères."
              : "Une erreur est survenue lors de l'opération."}
          </span>
        </div>
      )}

      {/* ── Navigation par Onglets ─────────────────────────────────── */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setTab("profile")}
          className={[
            "pb-3.5 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap",
            tab === "profile"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800",
          ].join(" ")}
        >
          <UserIcon className="w-4 h-4" />
          <span>Informations & Profil</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("sessions")}
          className={[
            "pb-3.5 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap",
            tab === "sessions"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800",
          ].join(" ")}
        >
          <ShieldIcon className="w-4 h-4" />
          <span>Sessions Actives & Appareils</span>
          {sessions.length > 0 && (
            <span className="ml-1 bg-emerald-100 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {sessions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTab("password")}
          className={[
            "pb-3.5 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap",
            tab === "password"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800",
          ].join(" ")}
        >
          <KeyIcon className="w-4 h-4" />
          <span>Mot de passe</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("rgpd")}
          className={[
            "pb-3.5 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap",
            tab === "rgpd"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800",
          ].join(" ")}
        >
          <LockIcon className="w-4 h-4" />
          <span>Confidentialité & RGPD</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ONGLET 1 : MODIFIER LE PROFIL CANDIDAT                         */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "profile" && (
        <form
          action={(fd) => {
            startTrans(async () => {
              await updateCandidateProfile(fd);
            });
          }}
          className="space-y-6"
        >
          {/* Carte Identité & Visibilité */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 flex-wrap pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-2xl font-black flex items-center justify-center shadow-md shadow-blue-500/20">
                  {user.name?.charAt(0)?.toUpperCase() || "C"}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{user.name || "Candidat"}</h2>
                  <p className="text-xs text-slate-500">{user.email}</p>
                  <span className="mt-1 inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                    {user.auth_provider === "google" ? "Authentifié via Google" : "Compte Email vérifié"}
                  </span>
                </div>
              </div>

              {/* Visibilité Switch */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="visible_to_companies"
                  name="visible_to_companies"
                  defaultChecked={profile.visible_to_companies !== false}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="visible_to_companies" className="text-xs cursor-pointer">
                  <span className="font-bold text-slate-900 block">Visible par les entreprises vérifiées</span>
                  <span className="text-slate-500 text-[11px]">Permettre aux recruteurs de voir mon profil pour des offres de stage / emploi</span>
                </label>
              </div>
            </div>

            {/* Champs de formulaire */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Nom Complet */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nom & Prénom *
                </label>
                <input
                  type="text"
                  name="full_name"
                  defaultValue={profile.full_name || user.name || ""}
                  required
                  placeholder="Ex: Asma Arbi"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Titre / Rôle visé */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Titre professionnel ou poste visé
                </label>
                <input
                  type="text"
                  name="title"
                  defaultValue={profile.title || ""}
                  placeholder="Ex: Étudiante Ingénieur Génie Logiciel / Full Stack"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  name="phone"
                  defaultValue={profile.phone || ""}
                  placeholder="Ex: +216 20 123 456"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Ville / Région */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ville / Région
                </label>
                <input
                  type="text"
                  name="city"
                  defaultValue={profile.city || ""}
                  placeholder="Ex: Tunis, Ariana, Sousse..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* École / Établissement */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  École ou Université
                </label>
                <input
                  type="text"
                  name="school"
                  defaultValue={profile.school || "ESPRIT"}
                  placeholder="Ex: ESPRIT, INSAT, ENIT..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              {/* Niveau d'études */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Niveau d&apos;études
                </label>
                <select
                  name="education_level"
                  defaultValue={profile.education_level || "Cycle Ingénieur (5ème année / PFE)"}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="Cycle Ingénieur (5ème année / PFE)">Cycle Ingénieur (5ème année / PFE)</option>
                  <option value="Cycle Ingénieur (4ème année)">Cycle Ingénieur (4ème année)</option>
                  <option value="Cycle Ingénieur (3ème année)">Cycle Ingénieur (3ème année)</option>
                  <option value="Master 2 / Mastère Professionnel">Master 2 / Mastère Professionnel</option>
                  <option value="Licence / Bac+3">Licence / Bac+3</option>
                  <option value="Diplômé(e) / En recherche de CDI">Diplômé(e) / En recherche de CDI</option>
                </select>
              </div>

              {/* Disponibilité */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Disponibilité & Type de contrat recherché
                </label>
                <select
                  name="availability"
                  defaultValue={profile.availability || "Stage PFE (Février 2027)"}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="Stage PFE (Février 2027)">Stage PFE (Février 2027)</option>
                  <option value="Stage de fin d'études / Pré-embauche">Stage de fin d&apos;études / Pré-embauche</option>
                  <option value="CDI — Disponibilité immédiate">CDI — Disponibilité immédiate</option>
                  <option value="Stage d'été (Juin - Août)">Stage d&apos;été (Juin - Août)</option>
                  <option value="Alternance / Contrat pro">Alternance / Contrat pro</option>
                </select>
              </div>

              {/* Compétences techniques */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Compétences techniques (séparées par des virgules)
                </label>
                <input
                  type="text"
                  name="skills"
                  value={skillsStr}
                  onChange={(e) => setSkillsStr(e.target.value)}
                  placeholder="Ex: Next.js, React, Node.js, TypeScript, MongoDB, Docker, Tailwind CSS, Python"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Astuce : ces mots-clés aident les entreprises vérifiées à vous repérer lors des recherches.
                </p>
              </div>

              {/* Bio / Présentation */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Bio / Résumé de présentation
                </label>
                <textarea
                  name="bio"
                  rows={3}
                  defaultValue={profile.bio || ""}
                  placeholder="Présentez brièvement vos centres d'intérêt, votre projet de fin d'études ou vos réalisations..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                />
              </div>

              {/* Liens Réseaux Sociaux & Portfolio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Profil GitHub
                </label>
                <input
                  type="url"
                  name="github_url"
                  defaultValue={profile.github_url || ""}
                  placeholder="https://github.com/mon-profil"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Profil LinkedIn
                </label>
                <input
                  type="url"
                  name="linkedin_url"
                  defaultValue={profile.linkedin_url || ""}
                  placeholder="https://linkedin.com/in/mon-profil"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Portfolio ou Site personnel
                </label>
                <input
                  type="url"
                  name="portfolio_url"
                  defaultValue={profile.portfolio_url || ""}
                  placeholder="https://monportfolio.tn"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Bouton de sauvegarde */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Enregistrement en cours...</span>
                  </>
                ) : (
                  <span>Enregistrer les modifications</span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ONGLET 2 : SESSIONS ACTIVES & APPAREILS CONNECTÉS              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "sessions" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Appareils & Sessions Connectées ({sessions.length})
                </h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Actif
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Supervisez tous les navigateurs ayant une session active sur votre compte SmartApply (tokens rotatifs sécurisés).
              </p>
            </div>

            {sessions.length > 1 && (
              <form action={revokeAllOtherSessionsAction}>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>Déconnecter tous les autres appareils</span>
                </button>
              </form>
            )}
          </div>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={[
                  "p-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors",
                  session.isCurrent ? "bg-blue-50/20" : "hover:bg-slate-50/50",
                ].join(" ")}
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className={[
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base font-bold shadow-sm",
                      session.isCurrent
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                        : "bg-slate-100 text-slate-600",
                    ].join(" ")}
                  >
                    💻
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-slate-900">
                        {session.deviceName}
                      </p>
                      {session.isCurrent && (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Cet appareil (Session actuelle)
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                      <span>
                        Adresse IP : <code className="text-slate-700 font-mono font-semibold">{session.ip}</code>
                      </span>
                      <span>•</span>
                      <span>
                        Dernière activité :{" "}
                        <span className="font-medium text-slate-700">
                          {new Date(session.last_active_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                      <span>•</span>
                      <span>
                        Créée le : {new Date(session.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </p>
                  </div>
                </div>

                <div>
                  {session.isCurrent ? (
                    <span className="text-xs font-semibold text-slate-400 italic px-3 py-1.5">
                      Session courante
                    </span>
                  ) : (
                    <form action={revokeSessionAction.bind(null, session.id)}>
                      <button
                        type="submit"
                        className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Déconnecter
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ONGLET 3 : MODIFIER LE MOT DE PASSE                            */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "password" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm animate-fade-in">
          <div>
            <h2 className="text-base font-bold text-slate-900">Modifier le mot de passe</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pour sécuriser votre compte, utilisez au moins 8 caractères avec chiffres et symboles.
            </p>
          </div>

          <form
            action={(fd) => {
              startTrans(async () => {
                await updatePassword(fd);
              });
            }}
            className="space-y-4 max-w-xl"
          >
            {user.auth_provider === "email" && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mot de passe actuel *
                </label>
                <input
                  type="password"
                  name="current_password"
                  required
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Nouveau mot de passe *
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  ✨ Suggérer un mot de passe fort
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="new_password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="Min. 8 caractères"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Confirmer le nouveau mot de passe *
              </label>
              <input
                type={showPassword ? "text" : "password"}
                name="confirm_password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirmez le nouveau mot de passe"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                Mettre à jour le mot de passe
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ONGLET 3 : CONFIDENTIALITÉ & RGPD                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {tab === "rgpd" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Protection des Données & Conformité RGPD
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Conformément à la réglementation sur la protection des données personnelles, vous disposez d&apos;un droit d&apos;accès, d&apos;exportation et de suppression.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Droit à la portabilité (Export JSON)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Téléchargez l&apos;intégralité de vos informations (données du profil, compétences, coordonnées, historique des sessions) dans un fichier JSON standardisé.
              </p>
              <button
                type="button"
                onClick={handleExportData}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-blue-500/20 inline-flex items-center gap-1.5"
              >
                📥 Exporter mes données personnelles (JSON)
              </button>
            </div>

            <div className="p-5 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Droit à l&apos;oubli
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pour demander l&apos;anonymisation ou la suppression définitive de votre compte et de toutes vos données de nos bases MongoDB, contactez notre équipe de support.
              </p>
              <a
                href="mailto:support@smartapply.tn?subject=Demande de suppression de compte RGPD"
                className="px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                Demander la suppression de mon compte
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}
