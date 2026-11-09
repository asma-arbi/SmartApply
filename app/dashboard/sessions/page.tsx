import { redirect } from "next/navigation";
import { getSessionUser, listActiveSessions } from "@/lib/auth/session";
import {
  revokeSessionAction,
  revokeAllOtherSessionsAction,
  revokeAllSessionsAction,
} from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function SessionsPage() {
  const sessionData = await getSessionUser();
  if (!sessionData) redirect("/login");

  const sessions = await listActiveSessions(sessionData.user.id);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto animate-fade-in">
      {/* ── En-tête ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              Sécurité du Compte
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Gestion des Sessions & Appareils Connectés
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Supervisez tous les navigateurs et appareils ayant accès à votre compte SmartApply.
          </p>
        </div>

        {sessions.length > 1 && (
          <form action={revokeAllOtherSessionsAction}>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <LogOutIcon />
              <span>Déconnecter tous les autres appareils</span>
            </button>
          </form>
        )}
      </div>

      {/* ── Banner Explications Sécurité ──────────────────────────── */}
      <div className="card p-5 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-500/20">
            <ShieldLockIcon />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Protection Avancée des Sessions (MongoDB + JWT)
            </h3>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Sessions chiffrées avec cookies <code>httpOnly</code>, <code>secure</code> et <code>sameSite=lax</code>.
              Chaque session dispose d&apos;un Access Token à courte durée et d&apos;une rotation automatique du Refresh Token côté serveur.
            </p>
          </div>
        </div>

        <form action={revokeAllSessionsAction}>
          <button
            type="submit"
            className="text-xs text-red-600 hover:text-red-700 bg-white hover:bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
          >
            Tout déconnecter
          </button>
        </form>
      </div>

      {/* ── Liste des sessions actives ────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Sessions Actives ({sessions.length})
          </h2>
          <span className="text-xs text-slate-400">
            Mise à jour en temps réel
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={[
                "p-5 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors",
                session.isCurrent ? "bg-blue-50/20" : "hover:bg-slate-50/50",
              ].join(" ")}
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={[
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg",
                    session.isCurrent
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                      : "bg-slate-100 text-slate-600",
                  ].join(" ")}
                >
                  <DeviceIcon deviceName={session.deviceName} />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-slate-900">
                      {session.deviceName}
                    </p>
                    {session.isCurrent && (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Cet appareil (Session actuelle)
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 flex items-center gap-3 flex-wrap">
                    <span>
                      Adresse IP : <code className="text-slate-700 font-mono">{session.ip}</code>
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

      {/* ── Détails techniques sur les expirations ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Expiration par Inactivité
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1">7 jours</p>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Toute session sans requête pendant 7 jours consécutifs est automatiquement expirée et révoquée.
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Expiration Absolue
          </p>
          <p className="text-lg font-bold text-slate-900 mt-1">30 jours</p>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Même avec une activité continue, une ré-authentification est requise après 30 jours maximum.
          </p>
        </div>

        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Changement de Mot de Passe
          </p>
          <p className="text-lg font-bold text-amber-600 mt-1">Révocation Globale</p>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            Dès qu&apos;un mot de passe est modifié, toutes les sessions actives sur tous les appareils sont immédiatement invalidées.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── SVG Icons ─────────────────────────────────────────────────── */
function DeviceIcon({ deviceName }: { deviceName: string }) {
  if (deviceName.includes("iOS") || deviceName.includes("Android")) {
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
        <path d="M12 18h.01" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function ShieldLockIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <circle cx="12" cy="11" r="2" />
      <path d="M12 13v2" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
