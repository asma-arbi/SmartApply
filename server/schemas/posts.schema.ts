import { z } from "zod";

export const PostCategorySchema = z.enum([
  "COMPANY_ANNOUNCEMENT",
  "JOB_OPENING",
  "INTERNSHIP_ANNOUNCEMENT",
  "PFE_ANNOUNCEMENT",
  "OPEN_DAY",
  "RECRUITMENT_NEWS",
  "CAREER_ADVICE",
  "WORKSHOP",
  "COMPANY_LIFE",
  "TESTIMONIAL",
  "SCHOLARSHIP",
  "CAMPUS_NEWS",
]);

export const PostStatusSchema = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED", "REMOVED"]);
export const PostSourceSchema = z.enum(["MANUAL", "IMPORTED"]);
export const ContentLanguageSchema = z.enum(["FR", "EN"]);
export const ReportReasonSchema = z.enum(["SPAM", "ABUSE", "MISINFORMATION", "COPYRIGHT", "OTHER"]);
export const PostKindSchema = z.enum([
  "TEXT",
  "PHOTO",
  "VIDEO",
  "DOCUMENT",
  "POLL",
  "EVENT",
  "CELEBRATE",
  "ARTICLE",
  "JOB",
]);
export const VisibilitySchema = z.enum(["PUBLIC", "MEMBERS"]);
export const CommentModeSchema = z.enum(["ANYONE", "NONE"]);
export const ReactionTypeSchema = z.enum([
  "LIKE",
  "LOVE",
  "CELEBRATE",
  "INSIGHTFUL",
  "SUPPORT",
  "FUNNY",
]);
export const ReactPostSchema = z.object({
  type: ReactionTypeSchema.optional(),
}).strict();
export const ModerationActionSchema = z.enum(["UNPUBLISH", "REMOVE", "RESTORE", "DISMISS_REPORTS"]);

const Uuid = z.string().refine(
  (value) => /^[0-9a-f]{24}$/i.test(value) || z.string().uuid().safeParse(value).success,
  "Identifiant invalide.",
);

const MediaSchema = z
  .object({
    type: z.enum(["image", "video", "document"]),
    url: z.string().url().max(2000),
    name: z.string().trim().max(120).optional(),
  })
  .strict();

const PollInputSchema = z
  .object({
    options: z.array(z.string().trim().min(1).max(80)).min(2).max(4),
    durationDays: z.union([z.literal(1), z.literal(3), z.literal(7), z.literal(14)]).optional(),
  })
  .strict();

const EventInputSchema = z
  .object({
    startsAt: z.string().trim().min(8).max(40),
    location: z.string().trim().max(160).optional(),
    link: z.string().url().max(2000).optional(),
  })
  .strict();

const CelebrationInputSchema = z
  .object({
    occasion: z.enum(["NEW_JOB", "GRADUATION", "PROMOTION", "PROJECT", "CERTIFICATE", "ANNIVERSARY"]),
  })
  .strict();

const JobDetailsSchema = z
  .object({
    family: z.string().trim().max(80).optional(),
    profession: z.string().trim().max(120).optional(),
    contractType: z.enum(["CDI", "CDD", "STAGE", "ALTERNANCE", "FREELANCE", "PFE"]).optional(),
    seniority: z.enum(["ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD"]).optional(),
    experience: z.string().trim().max(80).optional(),
    workMode: z.enum(["ONSITE", "HYBRID", "REMOTE"]).optional(),
    location: z.string().trim().max(120).optional(),
    governorate: z.string().trim().max(80).optional(),
    city: z.string().trim().max(80).optional(),
    salaryMin: z.number().int().min(0).max(10_000_000).optional(),
    salaryMax: z.number().int().min(0).max(10_000_000).optional(),
    currency: z.enum(["TND", "EUR"]).optional(),
    education: z.string().trim().max(120).optional(),
    skills: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    requiredSkills: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    preferredSkills: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
    responsibilities: z.array(z.string().trim().min(1).max(240)).max(12).optional(),
    deadline: z.string().trim().max(40).optional(),
    applicationUrl: z.string().url().max(2000).optional(),
  })
  .strict()
  .refine((value) => value.salaryMin === undefined || value.salaryMax === undefined || value.salaryMin <= value.salaryMax, {
    message: "Le salaire minimum doit être inférieur au salaire maximum.",
    path: ["salaryMin"],
  });

export const CreatePostSchema = z
  .object({
    companyId: Uuid.optional(),
    jobId: Uuid.nullish(),
    title: z.string().trim().min(3).max(200),
    body: z.string().trim().min(1).max(20_000),
    excerpt: z.string().trim().max(280).optional(),
    category: PostCategorySchema,
    tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    language: ContentLanguageSchema.optional(),
    source: PostSourceSchema.optional(),
    sourceUrl: z.string().url().max(2000).nullish(),
    sourceName: z.string().trim().max(120).nullish(),
    coverImageUrl: z.string().url().max(2000).nullish(),
    publish: z.boolean().optional(),
    postKind: PostKindSchema.optional(),
    visibility: VisibilitySchema.optional(),
    commentMode: CommentModeSchema.optional(),
    media: z.array(MediaSchema).max(4).optional(),
    poll: PollInputSchema.optional(),
    event: EventInputSchema.optional(),
    celebration: CelebrationInputSchema.optional(),
    jobDetails: JobDetailsSchema.optional(),
    scheduledAt: z.string().trim().min(8).max(40).nullish(),
    pinned: z.boolean().optional(),
    mentions: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
    repostOfId: Uuid.optional(),
  })
  .strict();

export const UpdatePostSchema = z
  .object({
    jobId: Uuid.nullish(),
    companyId: Uuid.nullish(),
    title: z.string().trim().min(3).max(200).optional(),
    body: z.string().trim().min(20).max(20_000).optional(),
    excerpt: z.string().trim().max(280).nullish(),
    category: PostCategorySchema.optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    language: ContentLanguageSchema.optional(),
    source: PostSourceSchema.optional(),
    sourceUrl: z.string().url().max(2000).nullish(),
    sourceName: z.string().trim().max(120).nullish(),
    coverImageUrl: z.string().url().max(2000).nullish(),
    unlinkJob: z.boolean().optional(),
    postKind: PostKindSchema.optional(),
    visibility: VisibilitySchema.optional(),
    commentMode: CommentModeSchema.optional(),
    media: z.array(MediaSchema).max(4).optional(),
    poll: PollInputSchema.optional(),
    event: EventInputSchema.optional(),
    celebration: CelebrationInputSchema.optional(),
    jobDetails: JobDetailsSchema.nullish(),
    scheduledAt: z.string().trim().min(8).max(40).nullish(),
    pinned: z.boolean().optional(),
    mentions: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  })
  .strict();

export const SearchPostsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: PostCategorySchema.optional(),
  companyId: Uuid.optional(),
  company: z.string().trim().max(120).optional(),
  authorId: Uuid.optional(),
  tag: z.string().trim().max(40).optional(),
  jobId: Uuid.optional(),
  job: z.string().trim().max(120).optional(),
  language: ContentLanguageSchema.optional(),
  source: PostSourceSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CompanyPostsQuerySchema = SearchPostsQuerySchema.extend({
  status: PostStatusSchema.optional(),
  companyId: Uuid.optional(),
});

export const VotePollSchema = z
  .object({
    optionIndex: z.number().int().min(0).max(3),
  })
  .strict();

export const CreateCommentSchema = z
  .object({
    body: z.string().trim().min(1).max(2000),
    parentId: Uuid.optional(),
  })
  .strict();

export const UpdateCommentSchema = z
  .object({
    body: z.string().trim().min(1).max(2000),
  })
  .strict();

export const CreateReportSchema = z
  .object({
    reason: ReportReasonSchema,
    details: z.string().trim().max(2000).optional(),
  })
  .strict();

export const ModeratePostSchema = z
  .object({
    action: ModerationActionSchema,
    reason: z.string().trim().min(3).max(1000),
  })
  .strict();

export const ReviewReportSchema = z
  .object({
    status: z.enum(["DISMISSED", "ACTIONED"]),
    reviewNote: z.string().trim().max(1000).optional(),
    action: ModerationActionSchema.optional(),
  })
  .strict();

export const AdminReportsQuerySchema = z.object({
  status: z.enum(["PENDING", "DISMISSED", "ACTIONED"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const BookmarksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CommentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
