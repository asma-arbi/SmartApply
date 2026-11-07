import { mongoose } from "@/server/lib/mongodb";
const { Schema, model, models } = mongoose;

export type ReactionType = "LIKE" | "LOVE" | "CELEBRATE" | "INSIGHTFUL" | "SUPPORT" | "FUNNY";
export type ReportReason = "SPAM" | "ABUSE" | "HARASSMENT" | "MISINFORMATION" | "INAPPROPRIATE" | "COPYRIGHT" | "OTHER";
export type ModerationAction = "UNPUBLISH" | "REMOVE" | "RESTORE" | "DISMISS_REPORTS";

const PostLikeSchema = new Schema(
  {
    postId: { type: String, required: true },
    userId: { type: String, required: true },
    type: { type: String, enum: ["LIKE", "LOVE", "CELEBRATE", "INSIGHTFUL", "SUPPORT", "FUNNY"], default: "LIKE" },
  },
  { timestamps: true, collection: "post_likes" }
);
PostLikeSchema.index({ postId: 1, userId: 1 }, { unique: true });
PostLikeSchema.index({ postId: 1, type: 1 });

const PostBookmarkSchema = new Schema(
  {
    postId: { type: String, required: true },
    userId: { type: String, required: true },
  },
  { timestamps: true, collection: "post_bookmarks" }
);
PostBookmarkSchema.index({ postId: 1, userId: 1 }, { unique: true });
PostBookmarkSchema.index({ userId: 1, createdAt: -1 });

const PostCommentSchema = new Schema(
  {
    postId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    parentId: { type: String, default: null },
    body: { type: String, default: "" },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "post_comments" }
);
PostCommentSchema.index({ postId: 1, parentId: 1, createdAt: 1 });

const CommentLikeSchema = new Schema(
  {
    commentId: { type: String, required: true },
    userId: { type: String, required: true },
    type: { type: String, enum: ["LIKE", "LOVE", "CELEBRATE", "INSIGHTFUL", "SUPPORT", "FUNNY"], default: "LIKE" },
  },
  { timestamps: true, collection: "comment_likes" }
);
CommentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true });

const PostHideSchema = new Schema(
  {
    postId: { type: String, required: true },
    userId: { type: String, required: true },
  },
  { timestamps: true, collection: "post_hides" }
);
PostHideSchema.index({ postId: 1, userId: 1 }, { unique: true });

const PostReportSchema = new Schema(
  {
    postId: { type: String, required: true, index: true },
    reporterId: { type: String, required: true },
    reason: { type: String, enum: ["SPAM", "ABUSE", "HARASSMENT", "MISINFORMATION", "INAPPROPRIATE", "COPYRIGHT", "OTHER"], required: true },
    details: { type: String, default: null },
    status: { type: String, enum: ["PENDING", "DISMISSED", "ACTIONED"], default: "PENDING", index: true },
    reviewedById: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: null },
  },
  { timestamps: true, collection: "post_reports" }
);
PostReportSchema.index({ postId: 1, reporterId: 1 });

const CompanyReportSchema = new Schema(
  {
    companyId: { type: String, required: true, index: true },
    reporterId: { type: String, required: true },
    reason: { type: String, enum: ["SPAM", "ABUSE", "HARASSMENT", "MISINFORMATION", "INAPPROPRIATE", "COPYRIGHT", "OTHER"], required: true },
    details: { type: String, default: null },
    status: { type: String, enum: ["PENDING", "DISMISSED", "ACTIONED"], default: "PENDING", index: true },
    reviewedById: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: null },
  },
  { timestamps: true, collection: "company_reports" },
);
CompanyReportSchema.index({ companyId: 1, reporterId: 1 }, { unique: true });

const PostPollVoteSchema = new Schema(
  {
    postId: { type: String, required: true },
    userId: { type: String, required: true },
    optionIndex: { type: Number, required: true },
  },
  { timestamps: true, collection: "post_poll_votes" }
);
PostPollVoteSchema.index({ postId: 1, userId: 1 }, { unique: true });
PostPollVoteSchema.index({ postId: 1, optionIndex: 1 });

const PostModerationLogSchema = new Schema(
  {
    postId: { type: String, required: true, index: true },
    adminId: { type: String, required: true },
    action: { type: String, enum: ["UNPUBLISH", "REMOVE", "RESTORE", "DISMISS_REPORTS"], required: true },
    reason: { type: String, default: "" },
  },
  { timestamps: true, collection: "post_moderation_logs" }
);

export const PostLike = models.PostLike || model("PostLike", PostLikeSchema);
export const PostBookmark = models.PostBookmark || model("PostBookmark", PostBookmarkSchema);
export const PostComment = models.PostComment || model("PostComment", PostCommentSchema);
export const CommentLike = models.CommentLike || model("CommentLike", CommentLikeSchema);
export const PostHide = models.PostHide || model("PostHide", PostHideSchema);
export const PostReport = models.PostReport || model("PostReport", PostReportSchema);
export const CompanyReport = models.CompanyReport || model("CompanyReport", CompanyReportSchema);
export const PostPollVote = models.PostPollVote || model("PostPollVote", PostPollVoteSchema);
export const PostModerationLog = models.PostModerationLog || model("PostModerationLog", PostModerationLogSchema);
