import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function PendingVerificationPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: company } = user
    ? await supabase.from("companies").select("name, status, rejection_reason").eq("id", user.id).single()
    : { data: null };

  const status = company?.status ?? "pending";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg animate-slide-up">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-black">S</span>
          </div>
          <div>
            <p className="text-slate-900 font-bold">SmartApply</p>
            <p className="text-blue-600 text-xs">Tunisia</p>
          </div>
        </div>

        <div className="card p-8">
          {status === "rejected" ? (
            /* Rejected */
            <>
              <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-center mb-5">
                <span className="text-3xl">❌</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-3">
                Demande refusée
              </h1>
              <p className="text-slate-500 text-sm mb-4 leading-relaxed">
                Votre demande de vérification a été refusée par notre équipe.
              </p>
              {company?.rejection_reason && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-5 text-sm text-red-700">
                  <p className="font-medium mb-1">Motif du refus :</p>
                  <p>{company.rejection_reason}</p>
                </div>
              )}
              <p className="text-slate-400 text-xs mb-6">
                Vous pouvez corriger les informations et soumettre à nouveau.
              </p>
              <div className="flex gap-3">
                <button className="btn-primary flex-1">
                  Soumettre à nouveau
                </button>
                <form action={logout}>
                  <button type="submit" className="btn-secondary px-4">
                    Déconnexion
                  </button>
                </form>
              </div>
            </>
          ) : (
            /* Pending */
            <>
              <div className="w-16 h-16 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mb-5">
                <span className="text-3xl">⏳</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-3">
                Vérification en cours
              </h1>
              <p className="text-slate-600 text-sm leading-relaxed mb-5">
                Votre compte entreprise{" "}
                <strong>{company?.name ?? ""}</strong> est en cours de vérification
                par notre équipe. Ce processus prend généralement <strong>24 à 48 heures</strong>.
              </p>

              {/* Steps */}
              <div className="space-y-3 mb-6">
                {[
                  { done: true, label: "Compte créé" },
                  { done: true, label: "Demande soumise" },
                  { done: false, label: "Vérification par l'équipe SmartApply" },
                  { done: false, label: "Accès activé" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className={[
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                        step.done
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-200 text-slate-400",
                      ].join(" ")}
                    >
                      {step.done ? "✓" : i + 1}
                    </div>
                    <span
                      className={[
                        "text-sm",
                        step.done ? "text-slate-700 font-medium" : "text-slate-400",
                      ].join(" ")}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-slate-400 text-xs mb-6">
                Vous recevrez un email dès que votre compte sera validé.
              </p>

              <form action={logout}>
                <button
                  type="submit"
                  className="w-full border border-slate-200 rounded-xl py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Se déconnecter
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Des questions ?{" "}
          <a href="mailto:support@smartapply.tn" className="text-blue-600 hover:underline">
            Contactez-nous
          </a>
        </p>
      </div>
    </div>
  );
}
