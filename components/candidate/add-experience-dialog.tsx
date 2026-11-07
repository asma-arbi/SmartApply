"use client";

import { useState, type FormEvent } from "react";
import { BadgeCheck, Loader2 } from "lucide-react";
import { createCandidateExperienceAction } from "@/server/actions/letters.actions";
import type { CandidateExperienceInput } from "@/lib/letters-api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const years = Array.from({ length: new Date().getFullYear() - 1949 }, (_, index) => new Date().getFullYear() - index);
const employmentOptions = [
  ["FULL_TIME", "Temps plein"], ["PART_TIME", "Temps partiel"], ["SELF_EMPLOYED", "Indépendant"],
  ["FREELANCE", "Freelance"], ["CONTRACT", "Contrat"], ["INTERNSHIP", "Stage"], ["APPRENTICESHIP", "Alternance"],
] as const;
const sourceOptions = [
  ["LINKEDIN", "LinkedIn"], ["COMPANY_SITE", "Site web de l’entreprise"], ["INDEED", "Indeed"],
  ["JOB_BOARD", "Autres sites d’offres d’emploi"], ["REFERRAL", "Recommandation"],
  ["RECRUITER", "Contacté(e) par un recruteur"], ["AGENCY", "Agence de recrutement"], ["OTHER", "Autre"],
] as const;
const fieldClass = "h-11 rounded-md border-slate-400 bg-white shadow-none focus-visible:ring-blue-600/20";
const labelClass = "grid gap-1.5 text-sm text-slate-700";
const selectClass = "h-11 w-full rounded-md border border-slate-400 bg-white px-3 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20";

function emptyExperience(): CandidateExperienceInput {
  return {
    title: "", company: "", location: "", isCurrent: true,
    startMonth: new Date().getMonth() + 1, startYear: new Date().getFullYear(),
    description: "", skills: [], notifyNetwork: false,
  };
}

export function AddExperienceDialog({ open, onOpenChange, onCreated }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}) {
  const [value, setValue] = useState<CandidateExperienceInput>(emptyExperience);
  const [skillsDraft, setSkillsDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function update<K extends keyof CandidateExperienceInput>(key: K, next: CandidateExperienceInput[K]) {
    setValue((current) => ({ ...current, [key]: next }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const skills = skillsDraft.split(",").map((skill) => skill.trim()).filter(Boolean).slice(0, 20);
      await createCandidateExperienceAction({
        ...value,
        skills,
        ...(value.isCurrent ? { endMonth: undefined, endYear: undefined } : {}),
        ...(value.mediaUrl?.trim() ? { mediaUrl: value.mediaUrl.trim() } : { mediaUrl: undefined }),
      });
      setValue(emptyExperience());
      setSkillsDraft("");
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d’enregistrer cette expérience.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-4xl">
      <DialogContent className="overflow-hidden rounded-xl border-0 bg-white p-0 text-slate-900 shadow-2xl" onClose={() => onOpenChange(false)}>
        <DialogHeader className="mb-0 border-b border-slate-200 px-7 py-4">
          <div>
            <DialogTitle className="text-xl font-semibold">Ajoutez un poste à votre profil</DialogTitle>
            <DialogDescription>Présentez votre expérience professionnelle à votre réseau.</DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={(event) => void submit(event)}>
          <div className="max-h-[min(72vh,760px)] space-y-6 overflow-y-auto px-7 py-6">
            <label className="flex items-center justify-between gap-4 rounded-lg bg-slate-100 px-5 py-4">
              <span><strong className="block text-sm font-semibold">Informer le réseau</strong><span className="mt-1 block text-sm text-slate-600">Enregistrez cette préférence avec votre expérience.</span></span>
              <input type="checkbox" checked={value.notifyNetwork} onChange={(event) => update("notifyNetwork", event.target.checked)} className="size-5 accent-blue-700" />
            </label>

            <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <label className={labelClass}>Intitulé du poste *<Input required minLength={2} maxLength={120} className={fieldClass} value={value.title} onChange={(event) => update("title", event.target.value)} placeholder="Exemple : Cheffe de produit senior" /></label>
              <label className={labelClass}>Organisation *<Input required minLength={2} maxLength={120} className={fieldClass} value={value.company} onChange={(event) => update("company", event.target.value)} placeholder="Exemple : Entreprise" /></label>
              <label className={labelClass}>Lieu<Input maxLength={120} className={fieldClass} value={value.location} onChange={(event) => update("location", event.target.value)} placeholder="Ville ou région" /></label>
              <label className={labelClass}>Type de lieu<select className={selectClass} value={value.locationType ?? ""} onChange={(event) => update("locationType", (event.target.value || undefined) as CandidateExperienceInput["locationType"])}><option value="">Veuillez sélectionner</option><option value="ONSITE">Sur site</option><option value="HYBRID">Hybride</option><option value="REMOTE">À distance</option></select></label>
              <label className={labelClass}>Type d’emploi<select className={selectClass} value={value.employmentType ?? ""} onChange={(event) => update("employmentType", (event.target.value || undefined) as CandidateExperienceInput["employmentType"])}><option value="">Veuillez sélectionner</option>{employmentOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <label className={labelClass}>Où avez-vous trouvé ce poste ?<select className={selectClass} value={value.source ?? ""} onChange={(event) => update("source", (event.target.value || undefined) as CandidateExperienceInput["source"])}><option value="">Veuillez sélectionner</option>{sourceOptions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            </div>

            <label className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" checked={value.isCurrent} onChange={(event) => update("isCurrent", event.target.checked)} className="size-5 accent-emerald-700" />Ceci est mon poste actuel</label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>Mois de début<select required className={selectClass} value={value.startMonth} onChange={(event) => update("startMonth", Number(event.target.value))}>{months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
                <label className={labelClass}>Année de début *<select required className={selectClass} value={value.startYear} onChange={(event) => update("startYear", Number(event.target.value))}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
              </div>
              {!value.isCurrent ? <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>Mois de fin<select required className={selectClass} value={value.endMonth ?? ""} onChange={(event) => update("endMonth", Number(event.target.value))}><option value="">Mois</option>{months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
                <label className={labelClass}>Année de fin *<select required className={selectClass} value={value.endYear ?? ""} onChange={(event) => update("endYear", Number(event.target.value))}><option value="">Année</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
              </div> : <p className="self-end pb-3 text-sm text-slate-500">En cours actuellement</p>}
            </div>

            <label className={labelClass}>Description <Textarea maxLength={3000} className="min-h-32 rounded-md border-slate-400 shadow-none" value={value.description} onChange={(event) => update("description", event.target.value)} placeholder="Vos projets, les problèmes résolus et les résultats obtenus" /></label>
            <label className={labelClass}>Compétences associées<Input className={fieldClass} value={skillsDraft} onChange={(event) => setSkillsDraft(event.target.value)} placeholder="React, gestion de projet, communication" /><span className="text-xs text-slate-500">Séparez les compétences par des virgules.</span></label>
            <label className={labelClass}>Lien média (facultatif)<Input type="url" maxLength={2000} className={fieldClass} value={value.mediaUrl ?? ""} onChange={(event) => update("mediaUrl", event.target.value)} placeholder="https://…" /></label>
            {error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          </div>
          <DialogFooter className="mt-0 flex-row justify-end border-t border-slate-200 px-7 py-4">
            <Button type="submit" disabled={busy} className="rounded-full bg-[#0a66c2] px-5 text-white hover:bg-[#004182]">{busy ? <Loader2 className="animate-spin" /> : <BadgeCheck />} Enregistrer</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
