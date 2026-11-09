import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/mongodb";
import { getSubscription, initBillingIndexes } from "@/lib/billing/db";
import { FREE_MAX_PUBLISHED_JOBS, PLAN_DESCRIPTIONS } from "@/lib/billing/plans";
import { PRO_ACTIVE_STATUSES } from "@/lib/billing/types";
import PlanBadge from "./components/PlanBadge";
import StatusBadge from "./components/StatusBadge";
import UsageGauge from "./components/UsageGauge";
import CheckoutButton from "./components/CheckoutButton";
import PortalButton from "./components/PortalButton";
import AdvisorCard from "./components/AdvisorCard";
import type { BillingPlan } from "@/lib/billing/types";

export const dynamic = "force-dynamic";

// ─── Helpers d'affichage ──────────────────────────────────────────────────────

function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default async function AbonnementPage({
  searchParams,
}: {
  searchParams?: { status?: string; session_id?: string };
}) {
  // 1. Auth + rôle
  const session = await getSessionUser();
  if (!session) redirect("/login");
  if (session.user.role !== "entreprise") redirect("/access-denied");

  const userId = session.user.id;

  // 2. Initialiser les index billing (idempotent)
  await initBillingIndexes();

  // 3. Données
  const db = await getDb();
  const sub = await getSubscription(userId);

  const publishedJobs = await db
    .collection("jobs")
    .countDocuments({ company_id: userId, status: "published" });

  const plan: BillingPlan =
    sub?.status && PRO_ACTIVE_STATUSES.includes(sub.status as any)
      ? "pro"
      : "free";

  const isPro = plan === "pro";
  const isPastDue = sub?.status === "past_due";
  const isCanceledAtEnd = sub?.cancelAtPeriodEnd && sub?.status === "active";
  const isCanceled =
    sub?.status === "canceled" ||
    sub?.status === "unpaid" ||
    sub?.status === "incomplete_expired";

  // 4. État de retour depuis Stripe Checkout
  const returnStatus = searchParams?.status;
  const isPendingActivation = returnStatus === "pending";
  const isCancelledCheckout = returnStatus === "cancelled";

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-3xl mx-auto animate-fade-in">
      {/* ── Titre ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Abonnement</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gérez votre plan et vos informations de facturation.
        </p>
      </div>

      {/* ── Bannière : activation en cours ─────────────────────────────── */}
      {isPendingActivation && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3 text-blue-900">
          <span className="text-2xl flex-shrink-0">⏳</span>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-blue-950">Activation en cours…</p>
            <p className="text-blue-800 mt-0.5">
              Votre paiement est en cours de traitement. Le plan Pro sera activé
              dans quelques instants une fois le paiement confirmé par Stripe.
              Rafraîchissez la page pour vérifier l&apos;état.
            </p>
          </div>
          <a
            href="/dashboard/company/abonnement"
            className="text-xs font-semibold bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors min-h-[36px] flex items-center"
          >
            Rafraîchir
          </a>
        </div>
      )}

      {/* ── Bannière : checkout annulé ───────────────────────────────── */}
      {isCancelledCheckout && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3 text-amber-900 text-sm">
          <span className="text-2xl flex-shrink-0">ℹ️</span>
          <p>Vous avez annulé le paiement. Vous êtes toujours sur le plan gratuit.</p>
        </div>
      )}

      {/* ── Bannière : paiement échoué ──────────────────────────────── */}
      {isPastDue && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 sm:p-5 flex items-start gap-3 text-red-900">
          <span className="text-2xl flex-shrink-0 leading-none mt-0.5">⚠️</span>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-red-950">Paiement échoué</p>
            <p className="text-red-800/90 mt-0.5">
              Votre dernier paiement n&apos;a pas pu être traité. Mettez à jour
              votre moyen de paiement pour maintenir votre accès Pro.
            </p>
          </div>
        </div>
      )}

      {/* ── Bannière : résiliation programmée ──────────────────────── */}
      {isCanceledAtEnd && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5 flex items-start gap-3 text-amber-900">
          <span className="text-2xl flex-shrink-0 leading-none mt-0.5">📅</span>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-950">Résiliation programmée</p>
            <p className="text-amber-800/90 mt-0.5">
              Votre abonnement Pro se terminera le{" "}
              <strong>{formatDate(sub?.currentPeriodEnd)}</strong>. Vous
              conserverez l&apos;accès Pro jusqu&apos;à cette date. Pour annuler
              la résiliation, cliquez sur « Gérer mon abonnement ».
            </p>
          </div>
        </div>
      )}

      {/* ── Bannière : abonnement terminé ────────────────────────────── */}
      {isCanceled && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 flex items-start gap-3 text-slate-700">
          <span className="text-2xl flex-shrink-0 leading-none mt-0.5">📋</span>
          <div className="flex-1 text-sm">
            <p className="font-semibold text-slate-900">Abonnement terminé</p>
            <p className="text-slate-600 mt-0.5">
              Votre abonnement Pro a pris fin. Vous êtes maintenant sur le plan
              gratuit. Repassez au Pro pour retrouver les offres illimitées.
            </p>
          </div>
        </div>
      )}

      {/* ── Carte Plan actuel ────────────────────────────────────────── */}
      <div className="card p-6 sm:p-7 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              Plan actuel
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              <PlanBadge plan={plan} />
              {sub?.status && (
                <StatusBadge
                  status={sub.status}
                  cancelAtPeriodEnd={sub.cancelAtPeriodEnd}
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {isPro ? (
              <PortalButton />
            ) : (
              <CheckoutButton />
            )}
            {isPastDue && <PortalButton />}
          </div>
        </div>

        {/* Description du plan */}
        <p className="text-slate-500 text-sm">{PLAN_DESCRIPTIONS[plan]}</p>

        {/* Dates Pro */}
        {isPro && sub?.currentPeriodEnd && (
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5 border border-slate-100">
            <div className="flex justify-between">
              <span className="text-slate-500">
                {sub.cancelAtPeriodEnd ? "Fin d'abonnement le" : "Renouvellement le"}
              </span>
              <span className="font-semibold text-slate-800">
                {formatDate(sub.currentPeriodEnd)}
              </span>
            </div>
          </div>
        )}

        {/* Jauge d'usage (plan gratuit uniquement) */}
        {!isPro && (
          <UsageGauge
            current={publishedJobs}
            max={FREE_MAX_PUBLISHED_JOBS}
            label="Offres publiées"
          />
        )}
      </div>

      {/* ── Comparaison des plans ─────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Gratuit */}
        <div
          className={`card p-5 space-y-3 ${
            !isPro ? "ring-2 ring-slate-300" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <PlanBadge plan="free" size="sm" />
            {!isPro && (
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Actuel
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-slate-900">
            0 TND
            <span className="text-sm font-normal text-slate-400">/mois</span>
          </p>
          <ul className="text-sm text-slate-600 space-y-1.5">
            <li className="flex items-center gap-2">
              <CheckIcon /> {FREE_MAX_PUBLISHED_JOBS} offre publiée simultanément
            </li>
            <li className="flex items-center gap-2 text-slate-400">
              <XIcon /> Support standard
            </li>
            <li className="flex items-center gap-2 text-slate-400">
              <XIcon /> Conseiller IA illimité
            </li>
          </ul>
        </div>

        {/* Pro */}
        <div
          className={`card p-5 space-y-3 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 ${
            isPro ? "ring-2 ring-indigo-400" : ""
          }`}
        >
          <div className="flex items-center justify-between">
            <PlanBadge plan="pro" size="sm" />
            {isPro && (
              <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wide">
                Actuel
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-slate-900">
            Sur devis
            <span className="text-sm font-normal text-slate-400"> /mois</span>
          </p>
          <ul className="text-sm text-slate-700 space-y-1.5">
            <li className="flex items-center gap-2">
              <CheckIcon color="indigo" /> Offres illimitées
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon color="indigo" /> Support prioritaire
            </li>
            <li className="flex items-center gap-2">
              <CheckIcon color="indigo" /> Conseiller IA inclus
            </li>
          </ul>
          {!isPro && (
            <div className="pt-1">
              <CheckoutButton />
            </div>
          )}
        </div>
      </div>

      {/* ── Conseiller IA ─────────────────────────────────────────────── */}
      <AdvisorCard />
    </div>
  );
}

// ─── Icônes ───────────────────────────────────────────────────────────────────

function CheckIcon({ color = "emerald" }: { color?: "emerald" | "indigo" }) {
  const cls =
    color === "indigo" ? "text-indigo-500" : "text-emerald-500";
  return (
    <svg
      className={`w-4 h-4 flex-shrink-0 ${cls}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="w-4 h-4 flex-shrink-0 text-slate-300"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
