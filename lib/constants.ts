import type {
  CelebrationOccasion,
  PostCategory,
  PostKind,
  PostLanguage,
  PostOrigin,
  PostStatus,
  ReactionType,
  ReportReason,
} from "@/types/post";

export const APP_NAME = "SmartApply";

export const ROLE_LABELS = {
  CANDIDATE: "Candidat",
  COMPANY: "Entreprise",
  ADMIN: "Admin",
} as const;

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const CATEGORIES: { value: PostCategory | "tous"; label: string; hint?: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "COMPANY_ANNOUNCEMENT", label: "Annonce entreprise", hint: "Nouvelle officielle" },
  { value: "CAREER_ADVICE", label: "Conseil carrière", hint: "Astuce pour candidater" },
  { value: "RECRUITMENT_NEWS", label: "Actualité recrutement", hint: "Processus et calendrier" },
  { value: "INTERNSHIP_ANNOUNCEMENT", label: "Annonce de stage", hint: "Stage ou alternance" },
  { value: "JOB_OPENING", label: "Offre d’emploi", hint: "CDI, CDD ou mission" },
  { value: "PFE_ANNOUNCEMENT", label: "PFE", hint: "Projet de fin d’études" },
  { value: "OPEN_DAY", label: "Portes ouvertes", hint: "Rencontre sur site" },
  { value: "WORKSHOP", label: "Atelier", hint: "Formation ou session" },
  { value: "COMPANY_LIFE", label: "Vie d’entreprise", hint: "Équipe et culture" },
  { value: "TESTIMONIAL", label: "Témoignage", hint: "Parcours d’un collaborateur" },
  { value: "SCHOLARSHIP", label: "Bourse", hint: "Programme ou financement" },
  { value: "CAMPUS_NEWS", label: "Campus", hint: "Écoles et étudiants" },
];

/** Chips du fil (maquette LinkedIn-style) */
export const FEED_CATEGORY_CHIPS: { value: PostCategory | "tous"; label: string }[] = [
  { value: "tous", label: "Tous" },
  { value: "COMPANY_ANNOUNCEMENT", label: "Annonce entreprise" },
  { value: "CAREER_ADVICE", label: "Conseil carrière" },
  { value: "RECRUITMENT_NEWS", label: "Actualité recrutement" },
  { value: "INTERNSHIP_ANNOUNCEMENT", label: "Annonce de stage" },
];

export const JOB_FAMILIES = [
  "Technologie & développement",
  "Data, IA & analytics",
  "Cybersécurité & réseaux",
  "Produit, UX/UI & design",
  "Marketing & communication",
  "Vente, commerce & relation client",
  "Finance, comptabilité & audit",
  "Ressources humaines & recrutement",
  "Ingénierie & industrie",
  "BTP, architecture & immobilier",
  "Logistique, achats & transport",
  "Juridique & conformité",
  "Santé & industrie pharmaceutique",
  "Éducation & formation",
  "Hôtellerie, restauration & tourisme",
  "Agriculture & environnement",
  "Administration & gestion",
  "Support technique & service client",
] as const;

export const JOB_TITLES = [
  "Développeur front-end", "Développeur back-end", "Développeur full stack", "Développeur mobile",
  "Ingénieur logiciel", "Ingénieur DevOps / Cloud", "Administrateur systèmes et réseaux",
  "Analyste cybersécurité", "Data Analyst", "Data Scientist", "Data Engineer", "Ingénieur IA / Machine Learning",
  "Chef de projet informatique", "Product Manager", "UX/UI Designer", "Testeur QA / automatisation",
  "Ingénieur mécanique", "Ingénieur électrique", "Ingénieur industriel", "Technicien de maintenance",
  "Conducteur de travaux", "Ingénieur civil", "Architecte", "Technicien laboratoire",
  "Comptable", "Contrôleur de gestion", "Auditeur financier", "Analyste financier",
  "Responsable ressources humaines", "Chargé de recrutement", "Gestionnaire de paie",
  "Responsable marketing digital", "Community Manager", "Graphiste", "Commercial B2B", "Conseiller clientèle",
  "Responsable logistique", "Gestionnaire des achats", "Technicien support informatique",
  "Juriste d’entreprise", "Pharmacien", "Délégué médical", "Enseignant / Formateur",
  "Technicien agricole", "Responsable qualité", "Chef de cuisine", "Responsable hôtelier",
] as const;

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  COMPANY_ANNOUNCEMENT: "Annonce entreprise",
  JOB_OPENING: "Offre d’emploi",
  INTERNSHIP_ANNOUNCEMENT: "Annonce de stage",
  PFE_ANNOUNCEMENT: "PFE",
  OPEN_DAY: "Portes ouvertes",
  RECRUITMENT_NEWS: "Actualité recrutement",
  CAREER_ADVICE: "Conseil carrière",
  WORKSHOP: "Atelier",
  COMPANY_LIFE: "Vie d’entreprise",
  TESTIMONIAL: "Témoignage",
  SCHOLARSHIP: "Bourse",
  CAMPUS_NEWS: "Campus",
};

export const STATUS_LABELS: Record<PostStatus, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  ARCHIVED: "Archivé",
  REMOVED: "Retiré",
};

export const ORIGIN_LABELS: Record<PostOrigin, string> = {
  manual: "",
  imported: "Importé",
};

export const LANGUAGE_LABELS: Record<PostLanguage, string> = {
  FR: "Français",
  EN: "English",
};

export const SOURCE_FILTERS: { value: "tous" | PostOrigin; label: string }[] = [
  { value: "tous", label: "Toutes origines" },
  { value: "manual", label: "Rédigés" },
  { value: "imported", label: "Importés" },
];

export const LANGUAGE_FILTERS: { value: "tous" | PostLanguage; label: string }[] = [
  { value: "tous", label: "FR + EN" },
  { value: "FR", label: "Français" },
  { value: "EN", label: "English" },
];

export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam ou publicité trompeuse" },
  { value: "MISINFORMATION", label: "Fausse offre ou arnaque au recrutement" },
  { value: "ABUSE", label: "Harcèlement ou contenu haineux" },
  { value: "COPYRIGHT", label: "Offre / contenu copié" },
  { value: "OTHER", label: "Autre" },
];

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  MISINFORMATION: "Fausse offre ou arnaque",
  SPAM: "Spam",
  COPYRIGHT: "Doublon / contenu copié",
  ABUSE: "Harcèlement ou contenu haineux",
  OTHER: "Autre",
};

export const POST_KIND_LABELS: Record<PostKind, string> = {
  TEXT: "Publication",
  PHOTO: "Photo",
  VIDEO: "Vidéo",
  DOCUMENT: "Document",
  POLL: "Sondage",
  EVENT: "Événement",
  CELEBRATE: "Célébration",
  ARTICLE: "Article",
  JOB: "Offre",
};

export const CELEBRATION_OPTIONS: { value: CelebrationOccasion; label: string }[] = [
  { value: "NEW_JOB", label: "Nouveau poste" },
  { value: "GRADUATION", label: "Diplôme" },
  { value: "PROMOTION", label: "Promotion" },
  { value: "PROJECT", label: "Projet" },
  { value: "CERTIFICATE", label: "Certification" },
  { value: "ANNIVERSARY", label: "Anniversaire professionnel" },
];

export const JOB_POST_CATEGORIES: { value: PostCategory; label: string }[] = [
  { value: "JOB_OPENING", label: "Emploi" },
  { value: "INTERNSHIP_ANNOUNCEMENT", label: "Stage" },
  { value: "PFE_ANNOUNCEMENT", label: "PFE" },
  { value: "SCHOLARSHIP", label: "Bourse" },
];

export const REACTIONS: {
  type: ReactionType;
  emoji: string;
  label: string;
  className: string;
}[] = [
  { type: "LIKE", emoji: "👍", label: "J’aime", className: "text-[#2563eb]" },
  { type: "CELEBRATE", emoji: "👏", label: "Bravo", className: "text-[#2563eb]" },
  { type: "SUPPORT", emoji: "🤝", label: "Soutien", className: "text-[#7A66CC]" },
  { type: "INSIGHTFUL", emoji: "💡", label: "Instructif", className: "text-[#F5C518]" },
  { type: "LOVE", emoji: "❤️", label: "J’adore", className: "text-[#DF704D]" },
  { type: "FUNNY", emoji: "😄", label: "Drôle", className: "text-[#E8A317]" },
];

export const fieldClass =
  "flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40";
