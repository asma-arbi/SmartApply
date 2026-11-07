import { connectDB } from "@/server/lib/mongodb";
import { User } from "@/server/models/user.model";
import type { AuthUser } from "@/server/middleware/auth";

export async function updatePresence(user: AuthUser) {
  await connectDB();
  const lastSeenAt = new Date();
  await User.updateOne({ _id: user.id }, { $set: { lastSeenAt } });
  return { lastSeenAt: lastSeenAt.toISOString() };
}
