import { connectDB } from "@/server/lib/mongodb";
import { CandidateProfile, Company, Job } from "@/server/models/catalog.model";
import type { AuthUser } from "@/server/middleware/auth";

const STOP_WORDS = new Set([
  "avec", "dans", "pour", "les", "des", "une", "and", "the", "with", "from", "your",
  "plus", "poste", "offre", "experience", "ans", "sur", "aux", "par", "this", "that",
  "le", "la", "de", "du", "un", "en", "et", "ou", "the", "of", "to", "in", "on",
]);
type MatchProfile = {
  skills?: unknown;
  headline?: string;
  bio?: string;
  education?: unknown;
  experiences?: unknown;
};
type MatchExperience = { title?: string; description?: string; skills?: string[] };

function keywords(values: string[]) {
  return new Set(
    values
      .flatMap((value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[a-z0-9+#.]{2,}/g) ?? [])
      .filter((word) => !STOP_WORDS.has(word)),
  );
}

function coverage(required: Set<string>, candidate: Set<string>) {
  if (!required.size) return 0;
  return [...required].filter((word) => candidate.has(word)).length / required.size;
}

export async function jobMatchesForCandidate(user: AuthUser) {
  await connectDB();
  const email = user.email.toLowerCase();
  const [profile, jobs, publishedOfferCount] = await Promise.all([
    CandidateProfile.findOne({ email }).lean() as unknown as Promise<MatchProfile | null>,
    Job.find({ status: "PUBLISHED" }).sort({ createdAt: -1 }).limit(100).lean(),
    Job.countDocuments({ status: "PUBLISHED" }),
  ]);

  const skills = Array.isArray(profile?.skills) ? profile.skills as string[] : [];
  const education = Array.isArray(profile?.education) ? profile.education as string[] : [];
  const experiences = Array.isArray(profile?.experiences) ? profile.experiences as MatchExperience[] : [];
  const candidateTerms = keywords([
    ...skills,
    profile?.headline ?? "",
    profile?.bio ?? "",
    ...education,
    ...experiences.flatMap((item) => [item.title ?? "", item.description ?? "", ...(item.skills ?? [])]),
  ]);

  const companyIds = [...new Set(jobs.map((job) => String(job.companyId)))];
  const companies = await Company.find({ _id: { $in: companyIds } }).select("name city logoUrl").lean();
  const companyById = new Map(companies.map((company) => [String(company._id), company]));

  const items = jobs.map((job) => {
    const titleTerms = keywords([job.title ?? ""]);
    const requirementTerms = keywords(Array.isArray(job.requirements) ? job.requirements : []);
    const descriptionTerms = keywords([job.description ?? ""]);
    const matchedRequirements = [...requirementTerms].filter((term) => candidateTerms.has(term));
    const matchedTitle = [...titleTerms].filter((term) => candidateTerms.has(term));

    const score = candidateTerms.size === 0
      ? 0
      : requirementTerms.size
        ? Math.round((coverage(requirementTerms, candidateTerms) * 0.75 + coverage(titleTerms, candidateTerms) * 0.25) * 100)
        : Math.round((coverage(titleTerms, candidateTerms) * 0.65 + coverage(descriptionTerms, candidateTerms) * 0.35) * 100);

    const company = companyById.get(String(job.companyId));
    return {
      id: String(job._id),
      title: String(job.title ?? "Offre"),
      city: String(job.city ?? ""),
      type: String(job.type ?? "CDI"),
      companyId: String(job.companyId),
      companyName: String(company?.name ?? "Entreprise"),
      companyLogoUrl: company?.logoUrl ?? null,
      description: String(job.description ?? ""),
      requirements: Array.isArray(job.requirements) ? job.requirements as string[] : [],
      score,
      matchedKeywords: [...new Set([...matchedRequirements, ...matchedTitle])].slice(0, 8),
      href: `/?category=JOB_OPENING&company=${encodeURIComponent(String(job.companyId))}&job=${encodeURIComponent(String(job._id))}`,
    };
  });

  items.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "fr"));
  return {
    items,
    profileReady: candidateTerms.size > 0,
    profileSkillCount: skills.length,
    publishedOfferCount,
    comparedOfferCount: jobs.length,
    scoringMethod: "Compétences et expériences du profil comparées aux exigences et au titre des offres publiées.",
  };
}
