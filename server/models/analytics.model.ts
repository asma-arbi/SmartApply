import { mongoose } from "@/server/lib/mongodb";

const { Schema, model, models } = mongoose;

const PostImpressionSchema = new Schema(
  {
    postId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    viewerId: { type: String, default: null },
    sessionId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "post_impressions" },
);
PostImpressionSchema.index({ postId: 1, sessionId: 1 }, { unique: true });
PostImpressionSchema.index({ ownerId: 1, createdAt: -1 });

const ProfileViewSchema = new Schema(
  {
    profileType: { type: String, enum: ["CANDIDATE", "COMPANY"], required: true },
    profileId: { type: String, required: true },
    ownerId: { type: String, required: true, index: true },
    viewerId: { type: String, default: null },
    sessionId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false }, collection: "profile_views" },
);
ProfileViewSchema.index({ profileType: 1, profileId: 1, sessionId: 1 }, { unique: true });
ProfileViewSchema.index({ ownerId: 1, createdAt: -1 });

export const PostImpression = models.PostImpression || model("PostImpression", PostImpressionSchema);
export const ProfileView = models.ProfileView || model("ProfileView", ProfileViewSchema);
