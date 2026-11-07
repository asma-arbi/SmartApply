export type PostCategory =
  | "COMPANY_ANNOUNCEMENT"
  | "JOB_OPENING"
  | "INTERNSHIP_ANNOUNCEMENT"
  | "PFE_ANNOUNCEMENT"
  | "OPEN_DAY"
  | "RECRUITMENT_NEWS"
  | "CAREER_ADVICE"
  | "WORKSHOP"
  | "COMPANY_LIFE"
  | "TESTIMONIAL"
  | "SCHOLARSHIP"
  | "CAMPUS_NEWS";

export type PostStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED" | "REMOVED";
export type PostOrigin = "manual" | "imported";
export type PostLanguage = "FR" | "EN";
export type ReportReason = "SPAM" | "ABUSE" | "MISINFORMATION" | "COPYRIGHT" | "OTHER";
export type ReportStatus = "PENDING" | "DISMISSED" | "ACTIONED";
export type UserRole = "CANDIDATE" | "COMPANY" | "ADMIN";
export type ModerateAction = "UNPUBLISH" | "REMOVE" | "RESTORE";
export type PostKind =
  | "TEXT"
  | "PHOTO"
  | "VIDEO"
  | "DOCUMENT"
  | "POLL"
  | "EVENT"
  | "CELEBRATE"
  | "ARTICLE"
  | "JOB";

export type PostVisibility = "PUBLIC" | "MEMBERS";
export type CommentMode = "ANYONE" | "NONE";
export type CelebrationOccasion =
  | "NEW_JOB"
  | "GRADUATION"
  | "PROMOTION"
  | "PROJECT"
  | "CERTIFICATE"
  | "ANNIVERSARY";

export type PostMedia = { type: "image" | "video" | "document"; url: string; name?: string };
export type PostPoll = { options: string[]; closesAt: string };
export type PostEvent = { startsAt: string; location?: string; link?: string };
export type PostCelebration = { occasion: CelebrationOccasion };
export type JobDetails = {
  family?: string;
  profession?: string;
  contractType?: "CDI" | "CDD" | "STAGE" | "ALTERNANCE" | "FREELANCE" | "PFE";
  seniority?: "ENTRY" | "JUNIOR" | "MID" | "SENIOR" | "LEAD";
  experience?: string;
  workMode?: "ONSITE" | "HYBRID" | "REMOTE";
  location?: string;
  governorate?: string;
  city?: string;
  salaryMin?: number;
  salaryMax?: number;
  currency?: "TND" | "EUR";
  education?: string;
  skills?: string[];
  requiredSkills?: string[];
  preferredSkills?: string[];
  responsibilities?: string[];
  deadline?: string;
  applicationUrl?: string;
};
export type PollResults = { counts: number[]; total: number; myOption: number | null };

export type ReactionType = "LIKE" | "LOVE" | "CELEBRATE" | "INSIGHTFUL" | "SUPPORT" | "FUNNY";

export const REACTION_TYPES: ReactionType[] = [
  "LIKE",
  "LOVE",
  "CELEBRATE",
  "INSIGHTFUL",
  "SUPPORT",
  "FUNNY",
];

export function emptyReactions(): Record<ReactionType, number> {
  return { LIKE: 0, LOVE: 0, CELEBRATE: 0, INSIGHTFUL: 0, SUPPORT: 0, FUNNY: 0 };
}

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
};

export type PostAuthor = {
  id?: string;
  name: string;
  initials: string;
};

export type Comment = {
  id: string;
  author: PostAuthor;
  content: string;
  createdAt: string;
  parentId?: string;
  deleted?: boolean;
  likes: number;
  liked: boolean;
  reaction: ReactionType | null;
  reactions: Record<ReactionType, number>;
  replies?: Comment[];
};

export type Report = {
  id: string;
  postId: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  reporterName: string;
  createdAt: string;
  postTitle?: string;
  postContent?: string;
  postAuthorName?: string;
  postReportCount?: number;
  reasonCounts?: Array<{ reason: ReportReason; count: number }>;
  reviewedAt?: string | null;
  reviewNote?: string | null;
};

export type Post = {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  author: PostAuthor;
  category: PostCategory;
  tags: string[];
  status: PostStatus;
  origin: PostOrigin;
  language: PostLanguage;
  sourceUrl?: string;
  sourceLabel?: string;
  coverImageUrl?: string;
  companyId?: string;
  companyName?: string;
  jobId?: string;
  jobTitle?: string;
  likes: number;
  bookmarks: number;
  liked: boolean;
  bookmarked: boolean;
  reaction: ReactionType | null;
  reactions: Record<ReactionType, number>;
  commentsCount: number;
  reposts: number;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
  postKind?: PostKind;
  visibility?: PostVisibility;
  commentMode?: CommentMode;
  media?: PostMedia[];
  poll?: PostPoll | null;
  event?: PostEvent | null;
  celebration?: PostCelebration | null;
  jobDetails?: JobDetails | null;
  pollResults?: PollResults | null;
  repostOfId?: string | null;
};

export type PostInput = {
  title: string;
  content: string;
  excerpt?: string;
  category: PostCategory;
  tags: string[];
  language: PostLanguage;
  companyId?: string;
  jobId?: string;
  origin: PostOrigin;
  sourceUrl?: string;
  sourceLabel?: string;
  coverImageUrl?: string;
  status: PostStatus;
  postKind?: PostKind;
  visibility?: PostVisibility;
  commentMode?: CommentMode;
  media?: PostMedia[];
  poll?: { options: string[]; durationDays?: 1 | 3 | 7 | 14 };
  event?: PostEvent;
  celebration?: PostCelebration;
  jobDetails?: JobDetails;
  scheduledAt?: string | null;
  pinned?: boolean;
  mentions?: string[];
  repostOfId?: string;
};

export type ApiPost = {
  id: string;
  title: string;
  body: string;
  excerpt: string | null;
  category: PostCategory;
  status: PostStatus;
  source: "MANUAL" | "IMPORTED";
  language?: PostLanguage;
  sourceUrl: string | null;
  sourceName: string | null;
  coverImageUrl?: string | null;
  companyId?: string | null;
  jobId?: string | null;
  companyName?: string | null;
  jobTitle?: string | null;
  postKind?: PostKind;
  visibility?: PostVisibility;
  commentMode?: CommentMode;
  media?: PostMedia[];
  poll?: PostPoll | null;
  event?: PostEvent | null;
  celebration?: PostCelebration | null;
  jobDetails?: JobDetails | null;
  pollResults?: PollResults | null;
  repostOfId?: string | null;
  tags?: string[];
  createdAt?: string;
  updatedAt: string;
  stats: {
    likes: number;
    comments: number;
    bookmarks: number;
    reposts?: number;
    reactions?: Record<ReactionType, number>;
  };
  viewer: { liked: boolean; bookmarked: boolean; reaction?: ReactionType | null } | null;
  author?: { id: string; name?: string | null; email?: string | null };
};

export type ApiComment = {
  id: string;
  body: string | null;
  deleted?: boolean;
  parentId?: string | null;
  author: { id: string; name?: string | null; email?: string | null };
  postKind?: PostKind;
  visibility?: PostVisibility;
  commentMode?: CommentMode;
  media?: PostMedia[];
  poll?: PostPoll | null;
  event?: PostEvent | null;
  celebration?: PostCelebration | null;
  pollResults?: PollResults | null;
  createdAt: string;
  likes?: number;
  reactions?: Record<ReactionType, number>;
  viewer?: { liked: boolean; reaction: ReactionType | null } | null;
  replies?: ApiComment[];
};

export type ApiReport = {
  id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  reporter: { id: string; name?: string | null; email?: string | null };
  post: ApiPost | null;
  postReportCount?: number;
  reasonCounts?: Array<{ reason: ReportReason; count: number }>;
  reviewedAt?: string | null;
  reviewNote?: string | null;
};
