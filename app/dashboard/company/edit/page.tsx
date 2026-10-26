import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateCompany } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function CompanyEditPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", user.id)
    .single();

  const sectors = [
    "IT",
    "Finance",
    "Santé",
    "E-commerce",
    "Industrie",
    "Autre",
  ];

  const sizes = [
    { value: "1-10", label: "1 à 10 employés (Startup / TPE)" },
    { value: "11-50", label: "11 à 50 employés (Petite entreprise)" },
    { value: "51-200", label: "51 à 200 employés (Moyenne entreprise)" },
    { value: "201-500", label: "201 à 500 employés (Grande entreprise)" },
    { value: "500+", label: "Plus de 500 employés (Grand groupe)" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Top navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/company"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeftIcon />
          Retour au tableau de bord
        </Link>
      </div>

      {/* Main Card */}
      <div className="card p-6 sm:p-8">
        <div className="border-b border-slate-100 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold">
              <BuildingIcon />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Modifier le profil de l&apos;entreprise
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Ces informations sont affichées sur vos offres d&apos;emploi et votre fiche publique.
              </p>
            </div>
          </div>
        </div>

        {searchParams.error === "name_required" && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            Le nom de l&apos;entreprise est obligatoire.
          </div>
        )}
        {searchParams.error === "update_failed" && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            Une erreur est survenue lors de l&apos;enregistrement. Veuillez réessayer.
          </div>
        )}

        <form action={updateCompany} className="space-y-6">
          {/* Row 1: Name & Sector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="name"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Nom de l&apos;entreprise <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={company?.name ?? ""}
                placeholder="Ex. SmartApply Inc."
                className="input-field"
              />
            </div>

            <div>
              <label
                htmlFor="sector"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Secteur d&apos;activité
              </label>
              <select
                id="sector"
                name="sector"
                defaultValue={company?.sector ?? ""}
                className="input-field"
              >
                <option value="">Sélectionner un secteur</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Size & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="size"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Taille de l&apos;entreprise
              </label>
              <select
                id="size"
                name="size"
                defaultValue={company?.size ?? ""}
                className="input-field"
              >
                <option value="">Sélectionner une taille</option>
                {sizes.map((sz) => (
                  <option key={sz.value} value={sz.value}>
                    {sz.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="city"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Ville / Région
              </label>
              <input
                id="city"
                name="city"
                type="text"
                defaultValue={company?.city ?? ""}
                placeholder="Ex. Tunis, Sousse, Sfax, Remote..."
                className="input-field"
              />
            </div>
          </div>

          {/* Row 3: Website & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="website"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Site web
              </label>
              <input
                id="website"
                name="website"
                type="url"
                defaultValue={company?.website ?? ""}
                placeholder="https://example.com"
                className="input-field"
              />
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Numéro de téléphone
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={company?.phone ?? ""}
                placeholder="+216 71 000 000"
                className="input-field"
              />
            </div>
          </div>

          {/* Row 4: LinkedIn & Logo URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="linkedin_url"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                Page LinkedIn
              </label>
              <input
                id="linkedin_url"
                name="linkedin_url"
                type="url"
                defaultValue={company?.linkedin_url ?? ""}
                placeholder="https://linkedin.com/company/..."
                className="input-field"
              />
            </div>

            <div>
              <label
                htmlFor="logo_url"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
              >
                URL du Logo
              </label>
              <input
                id="logo_url"
                name="logo_url"
                type="url"
                defaultValue={company?.logo_url ?? ""}
                placeholder="https://example.com/logo.png"
                className="input-field"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2"
            >
              Description de l&apos;entreprise
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              defaultValue={company?.description ?? ""}
              placeholder="Présentez votre entreprise, votre mission, votre culture d'équipe..."
              className="input-field resize-y"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href="/dashboard/company"
              className="btn-secondary"
            >
              Annuler
            </Link>
            <button
              type="submit"
              className="btn-primary"
            >
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" />
    </svg>
  );
}
