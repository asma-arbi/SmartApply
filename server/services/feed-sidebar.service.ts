import { connectDB } from "@/server/lib/mongodb";
import { Post } from "@/server/models/post.model";
import { PostLike, PostBookmark, PostComment } from "@/server/models/engagement.model";
import { PostImpression, ProfileView } from "@/server/models/analytics.model";
import { CandidateProfile, Company } from "@/server/models/catalog.model";
import { NetworkBlock, NetworkFollow } from "@/server/models/network.model";
import { User } from "@/server/models/user.model";
import { defaultCompanyId } from "@/server/services/catalog";
import type { AuthUser } from "@/server/middleware/auth";
import { candidateDisplayName } from "@/lib/candidate-name";

export async function getFeedSidebar(user?: AuthUser | null) {
  await connectDB();

  const followedCompanyIds = user
    ? (await NetworkFollow.find({ userId: user.id, targetType: "COMPANY" }).select("targetId").lean())
        .map((item) => String((item as unknown as { targetId: string }).targetId))
    : [];
  const followedCandidateIds = user?.role === "COMPANY"
    ? (await NetworkFollow.find({ userId: user.id, targetType: "CANDIDATE" }).select("targetId").lean())
        .map((item) => String((item as unknown as { targetId: string }).targetId))
    : [];
  const blockedCompanyIds = user
    ? (await NetworkBlock.find({ userId: user.id }).select("companyId").lean())
        .map((item) => String((item as unknown as { companyId: string }).companyId))
    : [];
  const ownCompanyId = user?.role === "COMPANY"
    ? await defaultCompanyId(user.role, user.email)
    : null;
  const [tagRows, companies, tipRows, candidateRows] = await Promise.all([
    Post.aggregate([
      { $match: { status: "PUBLISHED", deletedAt: null } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags.tag", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]).catch(() => []),
    Company.find({
      isVerified: true,
      ...(user ? {
        _id: { $nin: [...followedCompanyIds, ...blockedCompanyIds, ...(ownCompanyId ? [ownCompanyId] : [])] },
        $nor: [{ ownerEmail: user.email }, { recruiterEmail: user.email }],
      } : {}),
    })
      .sort({ name: 1 })
      .limit(8)
      .select("_id name city sector isVerified")
      .lean()
      .catch(() => []),
    Post.find({ status: "PUBLISHED", deletedAt: null, category: "CAREER_ADVICE" })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(3)
      .select("_id title excerpt")
      .lean()
      .catch(() => []),
    user?.role === "COMPANY"
      ? User.find({ role: "CANDIDATE", _id: { $nin: [user.id, ...followedCandidateIds] } })
          .select("_id email name").sort({ createdAt: -1 }).limit(12).lean().catch(() => [])
      : Promise.resolve([]),
  ]);

  const trendingTags = (tagRows as Array<{ _id: string; count: number }>).map((row) => ({
    tag: row._id,
    count: row.count,
  }));
  const careerTips = (tipRows as Array<{ _id: unknown; title?: string; excerpt?: string }>).map((post) => ({
    id: String(post._id),
    title: String(post.title || "Conseil carrière"),
    excerpt: String(post.excerpt || "Conseil carrière publié sur SmartApply."),
  }));

  // Get job counts for companies
  const { Job } = await import("@/server/models/catalog.model");
  const companyIds = (companies as Array<{ _id: unknown }>).map((c) => String(c._id));
  const jobCounts = await Job.aggregate([
    { $match: { companyId: { $in: companyIds }, status: "PUBLISHED" } },
    { $group: { _id: "$companyId", count: { $sum: 1 } } },
  ]).catch(() => []);
  const jobCountMap = new Map((jobCounts as Array<{ _id: string; count: number }>).map((r) => [r._id, r.count]));

  const suggestedCompanies = (companies as Array<{
    _id: unknown;
    name: string;
    city: string;
    sector: string;
    isVerified: boolean;
  }>).map((company) => ({
    id: String(company._id),
    name: company.name,
    city: company.city,
    sector: company.sector,
    isVerified: company.isVerified,
    jobsCount: jobCountMap.get(String(company._id)) ?? 0,
  }));

  const candidateEmails = (candidateRows as Array<{ email: string }>).map((candidate) => candidate.email.toLowerCase());
  const candidateProfiles = candidateEmails.length
    ? await CandidateProfile.find({ email: { $in: candidateEmails } }).select("email fullName city headline bio avatarUrl skills").lean().catch(() => [])
    : [];
  const profileByEmail = new Map((candidateProfiles as unknown as Array<{
    email: string; fullName?: string; city?: string; headline?: string; bio?: string; avatarUrl?: string | null; skills?: string[];
  }>).map((profile) => [profile.email.toLowerCase(), profile]));
  const suggestedCandidates = (candidateRows as Array<{ _id: unknown; email: string; name?: string }>).flatMap((candidate) => {
    const profile = profileByEmail.get(candidate.email.toLowerCase());
    if (!profile) return [];
    const fullName = candidateDisplayName(candidate.name, profile.fullName);
    return [{
      id: String(candidate._id),
      name: fullName,
      headline: profile.headline?.trim() && !/^candidat\s+smartapply(?:\s+tunisie)?$/i.test(profile.headline.trim()) ? profile.headline.trim() : "",
      bio: profile.bio?.trim() || "",
      city: profile.city?.trim() || "",
      avatarUrl: profile.avatarUrl ?? null,
      skills: (profile.skills ?? []).slice(0, 4),
    }];
  });

  let myStats = {
    publishedPosts: 0,
    draftPosts: 0,
    reactionsReceived: 0,
    commentsReceived: 0,
    bookmarks: 0,
    profileViews: 0,
    impressions: 0,
  };

  if (user) {
    const authorFilter = { authorId: user.id, deletedAt: null as Date | null };

    const [publishedPosts, draftPosts, bookmarks, publishedRows, profileViews] = await Promise.all([
        Post.countDocuments({ ...authorFilter, status: "PUBLISHED" }),
        Post.countDocuments({ ...authorFilter, status: "DRAFT" }),
        PostBookmark.countDocuments({ userId: user.id }),
        Post.find({ ...authorFilter, status: "PUBLISHED" }).select("_id").lean(),
        ProfileView.countDocuments({ ownerId: user.id }),
      ]);

    const ids = (publishedRows as Array<{ _id: unknown }>).map((post) => String(post._id));
    const [reactionsReceived, commentsReceived, impressions] = ids.length
      ? await Promise.all([
          PostLike.countDocuments({ postId: { $in: ids } }),
          PostComment.countDocuments({ postId: { $in: ids }, deletedAt: null }),
          PostImpression.countDocuments({ postId: { $in: ids } }),
        ])
      : [0, 0, 0];

    myStats = {
      publishedPosts,
      draftPosts,
      reactionsReceived,
      commentsReceived,
      bookmarks,
      profileViews,
      impressions,
    };
  }

  return { myStats, trendingTags, suggestedCompanies, suggestedCandidates, careerTips };
}
