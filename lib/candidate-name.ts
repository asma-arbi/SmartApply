const GENERIC_CANDIDATE_NAMES = new Set([
  "candidate",
  "candidate post",
  "candidate posts",
  "candidat",
  "candidat post",
  "candidat posts",
  "candidat smartapply",
]);

export function candidateDisplayName(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const name = value?.trim().replace(/[._]+/g, " ").replace(/\s+/g, " ");
    if (!name || name.includes("@") || GENERIC_CANDIDATE_NAMES.has(name.toLowerCase())) continue;
    return name;
  }
  return "Candidat";
}
