import { handleRoute, ok } from "@/server/lib/api";
import { NotFoundError } from "@/server/lib/errors";
import { getPublicUsers } from "@/server/lib/users";
import { profileFor } from "@/server/services/catalog";
import { isUuid } from "@/lib/mappers";
import { candidateDisplayName } from "@/lib/candidate-name";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { id: string };

/** GET /api/v1/candidates/:id — public candidate profile card. */
export const GET = handleRoute<Params>(async (_req, { params }) => {
  if (!isUuid(params.id)) throw new NotFoundError("Candidat introuvable.");
  const users = await getPublicUsers([params.id]);
  const author = users.get(params.id);
  if (!author) throw new NotFoundError("Candidat introuvable.");

  const profile = author.email ? await profileFor(author.email) : null;

  return ok({
    id: author.id,
    name: candidateDisplayName(profile?.fullName, author.name),
    email: author.email,
    city: profile?.city ?? null,
    headline: profile?.headline ?? "",
    bio: profile?.bio ?? "",
    avatarUrl: profile?.avatarUrl ?? null,
    coverUrl: profile?.coverUrl ?? null,
    skills: profile?.skills ?? [],
    education: profile?.education ?? [],
    experiences: profile?.experiences ?? [],
    languages: profile?.languages ?? [],
  });
});
