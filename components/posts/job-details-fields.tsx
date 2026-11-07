"use client";

import { JOB_FAMILIES, JOB_TITLES } from "@/lib/constants";
import type { JobDetails } from "@/types/post";
import { Input } from "@/components/ui/input";

const fieldClass = "h-10 rounded-lg";
const selectClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm";

export function JobDetailsFields({ value, onChange, showApplicationUrl = true }: { value: JobDetails; onChange: (next: JobDetails) => void; showApplicationUrl?: boolean }) {
  function update<K extends keyof JobDetails>(key: K, next: JobDetails[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <section className="space-y-3 rounded-xl border border-[var(--sa-border)] bg-[var(--sa-surface-soft)] p-3.5">
      <div>
        <h3 className="text-sm font-semibold text-[var(--sa-text)]">Détails avancés du poste</h3>
        <p className="mt-0.5 text-xs text-[var(--sa-text-secondary)]">Aidez les candidats à repérer le bon métier et les bonnes conditions.</p>
      </div>
      <label className="block space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">
        Métier / domaine
        <select className={selectClass} value={value.family ?? ""} onChange={(event) => update("family", event.target.value || undefined)}>
          <option value="">Choisir un métier</option>
          {JOB_FAMILIES.map((family) => <option key={family} value={family}>{family}</option>)}
        </select>
      </label>
      <label className="block space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">
        Intitulé précis du métier
        <Input
          className={fieldClass}
          list="smartapply-job-titles"
          value={value.profession ?? ""}
          onChange={(event) => update("profession", event.target.value || undefined)}
          placeholder="Ex. Data Engineer, Comptable, Ingénieur mécanique"
          maxLength={120}
        />
        <datalist id="smartapply-job-titles">
          {JOB_TITLES.map((title) => <option key={title} value={title} />)}
        </datalist>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">
          Type de contrat
          <select className={selectClass} value={value.contractType ?? ""} onChange={(event) => update("contractType", (event.target.value || undefined) as JobDetails["contractType"])}>
            <option value="">Non précisé</option><option value="CDI">CDI</option><option value="CDD">CDD</option><option value="STAGE">Stage</option><option value="ALTERNANCE">Alternance</option><option value="FREELANCE">Freelance</option><option value="PFE">PFE</option>
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">
          Niveau d’expérience
          <select className={selectClass} value={value.seniority ?? ""} onChange={(event) => update("seniority", (event.target.value || undefined) as JobDetails["seniority"])}>
            <option value="">Non précisé</option><option value="ENTRY">Débutant</option><option value="JUNIOR">Junior (1–3 ans)</option><option value="MID">Confirmé (3–5 ans)</option><option value="SENIOR">Senior (5+ ans)</option><option value="LEAD">Lead / management</option>
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">
          Mode de travail
          <select className={selectClass} value={value.workMode ?? ""} onChange={(event) => update("workMode", (event.target.value || undefined) as JobDetails["workMode"])}>
            <option value="">Non précisé</option><option value="ONSITE">Sur site</option><option value="HYBRID">Hybride</option><option value="REMOTE">À distance</option>
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">Expérience requise
          <Input className={fieldClass} value={value.experience ?? ""} onChange={(event) => update("experience", event.target.value || undefined)} placeholder="Ex. 2 ans en développement web" maxLength={80} />
        </label>
        <label className="space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">Gouvernorat
          <Input className={fieldClass} value={value.governorate ?? ""} onChange={(event) => update("governorate", event.target.value || undefined)} placeholder="Ex. Tunis, Sfax, Sousse" maxLength={80} />
        </label>
        <label className="space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">Ville / zone
          <Input className={fieldClass} value={value.city ?? ""} onChange={(event) => update("city", event.target.value || undefined)} placeholder="Ex. Les Berges du Lac" maxLength={80} />
        </label>
        <label className="space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">Salaire minimum
          <Input className={fieldClass} type="number" min={0} value={value.salaryMin ?? ""} onChange={(event) => update("salaryMin", event.target.value ? Number(event.target.value) : undefined)} placeholder="Ex. 1800" />
        </label>
        <label className="space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">Salaire maximum
          <Input className={fieldClass} type="number" min={0} value={value.salaryMax ?? ""} onChange={(event) => update("salaryMax", event.target.value ? Number(event.target.value) : undefined)} placeholder="Ex. 2500" />
        </label>
        <label className="space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">Devise
          <select className={selectClass} value={value.currency ?? "TND"} onChange={(event) => update("currency", event.target.value as JobDetails["currency"])}><option value="TND">TND</option><option value="EUR">EUR</option></select>
        </label>
        <label className="space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">Date limite de candidature
          <Input className={fieldClass} type="date" value={value.deadline?.slice(0, 10) ?? ""} onChange={(event) => update("deadline", event.target.value || undefined)} />
        </label>
      </div>
      <label className="block space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">Formation souhaitée
        <Input className={fieldClass} value={value.education ?? ""} onChange={(event) => update("education", event.target.value || undefined)} placeholder="Ex. Licence en informatique" maxLength={120} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">Compétences indispensables
          <Input className={fieldClass} value={value.requiredSkills?.join(", ") ?? ""} onChange={(event) => update("requiredSkills", event.target.value.split(",").map((skill) => skill.trim()).filter(Boolean).slice(0, 20))} placeholder="Ex. React, français B2" />
        </label>
        <label className="block space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">Compétences souhaitées
          <Input className={fieldClass} value={value.preferredSkills?.join(", ") ?? ""} onChange={(event) => update("preferredSkills", event.target.value.split(",").map((skill) => skill.trim()).filter(Boolean).slice(0, 20))} placeholder="Ex. Docker, anglais" />
        </label>
      </div>
      <label className="block space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">Missions principales (une par ligne)
        <textarea className="min-h-24 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={value.responsibilities?.join("\n") ?? ""} onChange={(event) => update("responsibilities", event.target.value.split(/\r?\n/).map((task) => task.trim()).filter(Boolean).slice(0, 12))} placeholder={"Ex. Développer les nouvelles fonctionnalités\nCollaborer avec l’équipe produit"} maxLength={2400} />
      </label>
      {showApplicationUrl ? (
        <label className="block space-y-1.5 text-xs font-medium text-[var(--sa-text-secondary)]">Lien de candidature
          <Input className={fieldClass} type="url" value={value.applicationUrl ?? ""} onChange={(event) => update("applicationUrl", event.target.value || undefined)} placeholder="https://…" maxLength={2000} />
        </label>
      ) : null}
    </section>
  );
}
