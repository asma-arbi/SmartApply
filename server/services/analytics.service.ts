import { z } from "zod";
import { Company } from "@/server/models/catalog.model";
import { Post } from "@/server/models/post.model";
import { User } from "@/server/models/user.model";
import { PostImpression, ProfileView } from "@/server/models/analytics.model";
import { connectDB } from "@/server/lib/mongodb";
import type { AuthUser } from "@/server/middleware/auth";

const sessionSchema = z.string().uuid();

export async function recordPostImpression(user: AuthUser | null, postId: string, sessionId: string) {
  await connectDB();
  const post = await Post.findById(postId).select("authorId status deletedAt").lean() as {
    authorId: string; status: string; deletedAt: Date | null;
  } | null;
  if (!post || post.status !== "PUBLISHED" || post.deletedAt || user?.id === post.authorId) return { recorded: false };
  const validSession = sessionSchema.parse(sessionId);
  await PostImpression.updateOne(
    { postId, sessionId: validSession },
    { $setOnInsert: { postId, ownerId: post.authorId, viewerId: user?.id ?? null, sessionId: validSession } },
    { upsert: true },
  ).catch((error: { code?: number }) => {
    if (error.code !== 11000) throw error;
  });
  return { recorded: true };
}

export async function recordProfileView(
  user: AuthUser | null,
  profileType: "CANDIDATE" | "COMPANY",
  profileId: string,
  sessionId: string,
) {
  await connectDB();
  const validSession = sessionSchema.parse(sessionId);
  let ownerId = profileId;
  if (profileType === "COMPANY") {
    const company = await Company.findById(profileId).select("ownerEmail recruiterEmail").lean() as {
      ownerEmail?: string | null; recruiterEmail?: string | null;
    } | null;
    if (!company) return { recorded: false };
    const ownerEmail = company.ownerEmail || company.recruiterEmail;
    const owner = ownerEmail ? await User.findOne({ email: ownerEmail.toLowerCase() }).select("_id").lean() as { _id: string } | null : null;
    if (!owner) return { recorded: false };
    ownerId = String(owner._id);
  } else {
    const owner = await User.findById(profileId).select("_id role").lean() as { _id: string; role: string } | null;
    if (!owner || owner.role !== "CANDIDATE") return { recorded: false };
  }
  if (user?.id === ownerId) return { recorded: false };
  await ProfileView.updateOne(
    { profileType, profileId, sessionId: validSession },
    { $setOnInsert: { profileType, profileId, ownerId, viewerId: user?.id ?? null, sessionId: validSession } },
    { upsert: true },
  ).catch((error: { code?: number }) => {
    if (error.code !== 11000) throw error;
  });
  return { recorded: true };
}
