"use client";

import { useState } from "react";
import { Job } from "@/lib/models/types";
import { saveJob } from "@/app/actions";
import { 
  JOB_CATEGORIES, 
  JOB_TYPES, 
  EXPERIENCE_LEVELS, 
  WORK_MODES, 
  CURRENCIES 
} from "@/lib/jobs/validation";

interface JobFormProps {
  job?: Job | null;
}

export default function JobForm({ job }: JobFormProps) {
  const [status, setStatus] = useState<string>(job?.status || "draft");
  const [showAdvanced, setShowAdvanced] = useState(!!job);

  return (
    <form action={saveJob} className="space-y-6">
      {job && <input type="hidden" name="id" value={job.id} />}

      {/* Basic Information */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">
          Informations de base
        </h2>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Titre du poste <span className="text-red-500">*</span>
          </label>
          <input
            name="title"
            required
            defaultValue={job?.title}
            placeholder="Ex: Développeur Frontend React"
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Localisation <span className="text-red-500">*</span>
            </label>
            <input
              name="location"
              required
              defaultValue={job?.location}
              placeholder="Ex: Tunis, Ariana"
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Type de contrat <span className="text-red-500">*</span>
            </label>
            <select
              name="type"
              required
              defaultValue={job?.type || "CDI"}
              className="input-field"
            >
              {JOB_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Description du poste <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            required
            rows={8}
            defaultValue={job?.description}
            placeholder="Décrivez le poste, les missions principales, l'environnement de travail..."
            className="input-field"
          />
          <p className="text-xs text-slate-400 mt-1">
            Minimum 100 caractères pour publier l&apos;offre
          </p>
        </div>
      </div>

      {/* Extended Information */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="font-bold text-slate-900 text-lg">
            Informations complémentaires
          </h2>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            {showAdvanced ? "Masquer" : "Afficher"}
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Catégorie
                </label>
                <select
                  name="category"
                  defaultValue={job?.category || ""}
                  className="input-field"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {JOB_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Mode de travail
                </label>
                <select
                  name="work_mode"
                  defaultValue={job?.work_mode || ""}
                  className="input-field"
                >
                  <option value="">Sélectionner un mode</option>
                  {WORK_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Niveau d&apos;expérience
              </label>
              <select
                name="experience_level"
                defaultValue={job?.experience_level || ""}
                className="input-field"
              >
                <option value="">Sélectionner un niveau</option>
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Salary Range */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Fourchette salariale (optionnel)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  name="salary_min"
                  defaultValue={job?.salary_min}
                  placeholder="Min"
                  min="0"
                  step="100"
                  className="input-field"
                />
                <input
                  type="number"
                  name="salary_max"
                  defaultValue={job?.salary_max}
                  placeholder="Max"
                  min="0"
                  step="100"
                  className="input-field"
                />
                <select
                  name="currency"
                  defaultValue={job?.currency || "TND"}
                  className="input-field"
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.value} value={curr.value}>
                      {curr.value}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Date limite de candidature
              </label>
              <input
                type="date"
                name="application_deadline"
                defaultValue={
                  job?.application_deadline
                    ? new Date(job.application_deadline).toISOString().split("T")[0]
                    : ""
                }
                className="input-field"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Compétences requises
              </label>
              <input
                name="skills"
                defaultValue={job?.skills?.join(", ")}
                placeholder="Ex: React, TypeScript, Next.js (séparées par des virgules)"
                className="input-field"
              />
              <p className="text-xs text-slate-400 mt-1">
                Séparez les compétences par des virgules
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Exigences (une par ligne)
              </label>
              <textarea
                name="requirements"
                rows={4}
                defaultValue={job?.requirements?.join("\n")}
                placeholder="Ex:&#10;Bac+5 en informatique&#10;3 ans d'expérience minimum&#10;Maîtrise de React"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Responsabilités (une par ligne)
              </label>
              <textarea
                name="responsibilities"
                rows={4}
                defaultValue={job?.responsibilities?.join("\n")}
                placeholder="Ex:&#10;Développer de nouvelles fonctionnalités&#10;Collaborer avec l'équipe design&#10;Maintenir la qualité du code"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Avantages (un par ligne)
              </label>
              <textarea
                name="benefits"
                rows={4}
                defaultValue={job?.benefits?.join("\n")}
                placeholder="Ex:&#10;Assurance santé&#10;Télétravail flexible&#10;Formation continue"
                className="input-field"
              />
            </div>
          </div>
        )}
      </div>

      {/* Status Selection */}
      <div className="card p-6 space-y-4">
        <h2 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">
          Statut de publication
        </h2>

        <div className="space-y-3">
          {[
            {
              value: "draft",
              label: "Brouillon",
              description: "L'offre n'est pas visible publiquement. Vous pourrez la publier plus tard.",
              color: "amber",
            },
            {
              value: "published",
              label: "Publier maintenant",
              description: "L'offre sera visible publiquement après validation des informations.",
              color: "emerald",
            },
          ].map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                status === option.value
                  ? `border-${option.color}-500 bg-${option.color}-50`
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="status"
                value={option.value}
                checked={status === option.value}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <p className="font-semibold text-slate-900 text-sm">{option.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <a
          href="/dashboard/company/jobs"
          className="text-sm text-slate-600 hover:text-slate-900 font-medium"
        >
          Annuler
        </a>
        <div className="flex items-center gap-3">
          {status === "published" && (
            <button
              type="submit"
              onClick={() => setStatus("draft")}
              className="btn-secondary"
            >
              Enregistrer comme brouillon
            </button>
          )}
          <button type="submit" className="btn-primary px-6">
            {status === "published" ? "Publier l'offre" : "Enregistrer"}
          </button>
        </div>
      </div>
    </form>
  );
}
