import { connectDB } from "@/server/lib/mongodb";
import { User } from "@/server/models/user.model";
import { Company } from "@/server/models/catalog.model";

export type PublicAuthor = {
  id: string;
  email: string | null;
  name: string;
};

const cache = new Map<string, PublicAuthor>();

export function nameFromEmail(email: string) {
  const local = email.split("@")[0]?.trim();
  return local || email;
}

export function publicAuthor(id: string, users: Map<string, PublicAuthor>): PublicAuthor {
  return users.get(id) ?? { id, email: null, name: "Utilisateur" };
}

export async function getPublicUsers(ids: string[]): Promise<Map<string, PublicAuthor>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const result = new Map<string, PublicAuthor>();
  const missing: string[] = [];
  for (const id of unique) {
    const found = cache.get(id);
    if (found) result.set(id, found);
    else missing.push(id);
  }
  if (!missing.length) return result;

  await connectDB();
  const rows = await User.find({ _id: { $in: missing } }).select("_id email name").lean() as unknown as Array<{
    _id: unknown;
    email: string;
    name?: string;
  }>;
  for (const row of rows) {
    const id = String(row._id);
    const author = { id, email: row.email, name: row.name?.trim() || nameFromEmail(row.email) };
    cache.set(id, author);
    result.set(id, author);
  }
  return result;
}

export async function decorateAuthors<T extends { authorId: string; companyId?: string | null }>(
  items: T[],
): Promise<Array<T & { author: PublicAuthor }>> {
  const users = await getPublicUsers(items.map((item) => item.authorId));
  const companyIds = [...new Set(
    items
      .filter((item) => !users.has(item.authorId) && item.companyId)
      .map((item) => item.companyId as string),
  )];
  if (companyIds.length) await connectDB();
  const companies = companyIds.length
    ? (await Company.find({ _id: { $in: companyIds } }).select("_id name").lean()) as unknown as Array<{ _id: unknown; name: string }>
    : [];
  const companyNames = new Map(companies.map((company) => [String(company._id), company.name]));

  return items.map((item) => {
    const author = publicAuthor(item.authorId, users);
    if (author.name === "Utilisateur" && item.companyId) {
      author.name = companyNames.get(item.companyId) ?? author.name;
    }
    return { ...item, author };
  });
}
