import { connectDB } from "@/server/lib/mongodb";
import { NetworkFollow, NetworkConnection, NetworkBlock, NetworkNotification } from "@/server/models/network.model";
import { CandidateProfile, Company } from "@/server/models/catalog.model";
import { User } from "@/server/models/user.model";
import type { AuthUser } from "@/server/middleware/auth";
import { ValidationError } from "@/server/lib/errors";

export type NetworkTargetType = "company" | "candidate";

export async function companyFollowersSummary(companyId: string, viewer?: AuthUser | null) {
  if (!companyId.trim()) throw new ValidationError("Entreprise invalide.");
  await connectDB();
  const count = await NetworkFollow.countDocuments({ targetType: "COMPANY", targetId: companyId });
  if (!viewer || count === 0) return { count, mutualFollowers: [] as Array<{ id: string; name: string; avatarUrl: string | null }> };

  const connections = await NetworkConnection.find({
    status: "CONNECTED",
    $or: [{ requesterId: viewer.id }, { targetId: viewer.id }],
  }).select("requesterId targetId").lean();
  const connectedIds = [...new Set((connections as unknown as Array<{ requesterId: string; targetId: string }>)
    .map((row) => row.requesterId === viewer.id ? row.targetId : row.requesterId)
    .filter(Boolean))];
  if (connectedIds.length === 0) return { count, mutualFollowers: [] as Array<{ id: string; name: string; avatarUrl: string | null }> };

  const followedConnections = await NetworkFollow.find({
    targetType: "COMPANY",
    targetId: companyId,
    userId: { $in: connectedIds },
  }).select("userId").sort({ createdAt: 1 }).limit(3).lean();
  const followerIds = (followedConnections as unknown as Array<{ userId: string }>).map((row) => row.userId);
  if (followerIds.length === 0) return { count, mutualFollowers: [] as Array<{ id: string; name: string; avatarUrl: string | null }> };

  const users = await User.find({ _id: { $in: followerIds }, role: "CANDIDATE" }).select("_id email name").lean() as unknown as Array<{
    _id: unknown;
    email: string;
    name?: string;
  }>;
  if (users.length === 0) return { count, mutualFollowers: [] as Array<{ id: string; name: string; avatarUrl: string | null }> };

  const profiles = await CandidateProfile.find({ email: { $in: users.map((user) => user.email) } })
    .select("email fullName avatarUrl").lean() as unknown as Array<{ email: string; fullName?: string; avatarUrl?: string | null }>;
  const profileByEmail = new Map(profiles.map((profile) => [profile.email.toLowerCase(), profile]));
  const userById = new Map(users.map((user) => [String(user._id), user]));

  return {
    count,
    mutualFollowers: followerIds.flatMap((id) => {
      const user = userById.get(id);
      if (!user) return [];
      const profile = profileByEmail.get(user.email.toLowerCase());
      return [{
        id,
        name: profile?.fullName?.trim() || user.name?.trim() || "Membre",
        avatarUrl: profile?.avatarUrl ?? null,
      }];
    }),
  };
}

export async function companyConnectionStatus(user: AuthUser, companyId: string) {
  if (user.role !== "CANDIDATE") return { status: "none" as const };
  await connectDB();
  const company = await Company.findById(companyId).select("ownerEmail recruiterEmail").lean() as { ownerEmail?: string | null; recruiterEmail?: string | null } | null;
  if (!company) throw new ValidationError("Entreprise introuvable.");
  const email = company.ownerEmail || company.recruiterEmail;
  const owner = email
    ? await User.findOne({ email: email.toLowerCase(), role: "COMPANY" }).select("_id").lean() as { _id: unknown } | null
    : null;
  if (!owner) return { status: "none" as const };
  const connection = await NetworkConnection.findOne({
    $or: [
      { requesterId: user.id, targetId: String(owner._id) },
      { requesterId: String(owner._id), targetId: user.id },
    ],
  }).select("status").lean() as { status: string } | null;
  if (connection?.status === "CONNECTED") return { status: "connected" as const };
  return { status: connection?.status === "PENDING" ? "pending" as const : "none" as const };
}

function toDbType(type: NetworkTargetType) {
  return type === "company" ? "COMPANY" : "CANDIDATE";
}

export async function listNetworkState(user: AuthUser) {
  await connectDB();
  const [follows, outgoing, incoming, blockedCompanies] = await Promise.all([
    NetworkFollow.find({ userId: user.id }).select("targetType targetId").lean(),
    NetworkConnection.find({ requesterId: user.id }).select("targetId status").lean(),
    NetworkConnection.find({ targetId: user.id }).select("requesterId status").lean(),
    NetworkBlock.find({ userId: user.id }).select("companyId").lean(),
  ]);

  const incomingRows = incoming as unknown as Array<{ requesterId: string; status: string; createdAt?: Date }>;
  const outgoingRows = outgoing as unknown as Array<{ targetId: string; status: string }>;
  const incomingPending = incomingRows
    .filter((row) => row.status === "PENDING");
  const requesters = incomingPending.length
    ? await User.find({ _id: { $in: incomingPending.map((row) => row.requesterId) } }).select("_id name email role").lean()
    : [];
  const requesterMap = new Map((requesters as unknown as Array<{ _id: unknown; name?: string; email: string; role: string }>).map((row) => [String(row._id), row]));
  const companyRequesters = (requesters as unknown as Array<{ _id: unknown; email: string; role: string }>).filter((row) => row.role === "COMPANY");
  const companyProfiles = companyRequesters.length
    ? await Company.find({ $or: [
        { ownerEmail: { $in: companyRequesters.map((row) => row.email) } },
        { recruiterEmail: { $in: companyRequesters.map((row) => row.email) } },
      ] }).select("_id name ownerEmail recruiterEmail").lean() as unknown as Array<{ _id: unknown; name: string; ownerEmail?: string; recruiterEmail?: string }>
    : [];
  const companyByEmail = new Map<string, { id: string; name: string }>();
  for (const company of companyProfiles) {
    for (const email of [company.ownerEmail, company.recruiterEmail]) {
      if (email) companyByEmail.set(email.toLowerCase(), { id: String(company._id), name: company.name });
    }
  }

  return {
    follows: (follows as unknown as Array<{ targetType: string; targetId: string }>).map((row) => ({
      type: row.targetType === "COMPANY" ? ("company" as const) : ("candidate" as const),
      id: row.targetId,
    })),
    connects: [
      ...outgoingRows.filter((row) => row.status !== "REJECTED").map((row) => ({
        candidateId: row.targetId,
        status: row.status === "CONNECTED" ? ("connected" as const) : ("pending" as const),
        direction: "out" as const,
      })),
      ...incomingRows.filter((row) => row.status === "CONNECTED").map((row) => ({
        candidateId: row.requesterId,
        status: "connected" as const,
        direction: "in" as const,
      })),
    ],
    incomingRequests: incomingPending.map((row) => {
      const requester = requesterMap.get(row.requesterId);
      return {
        requesterId: row.requesterId,
        name: requester?.name?.trim() || requester?.email.split("@")[0] || "Membre",
        role: requester?.role ?? "CANDIDATE",
        href: requester?.role === "COMPANY" && requester.email && companyByEmail.has(requester.email.toLowerCase())
          ? `/entreprises/${encodeURIComponent(companyByEmail.get(requester.email.toLowerCase())!.id)}`
          : `/candidats/${encodeURIComponent(row.requesterId)}`,
        createdAt: row.createdAt?.toISOString() ?? null,
      };
    }),
    blockedCompanies: (blockedCompanies as unknown as Array<{ companyId: string }>).map((row) => row.companyId),
  };
}

export async function setCompanyBlocked(user: AuthUser, companyId: string, blocked: boolean) {
  if (!companyId.trim()) throw new ValidationError("Entreprise invalide.");
  await connectDB();
  const company = await Company.findById(companyId).select("_id").lean();
  if (!company) throw new ValidationError("Entreprise introuvable.");
  if (blocked) {
    await NetworkBlock.updateOne({ userId: user.id, companyId }, { $setOnInsert: { userId: user.id, companyId } }, { upsert: true });
    await NetworkFollow.deleteOne({ userId: user.id, targetType: "COMPANY", targetId: companyId });
  } else {
    await NetworkBlock.deleteOne({ userId: user.id, companyId });
  }
  return { blocked };
}

export async function toggleFollow(
  user: AuthUser,
  type: NetworkTargetType,
  targetId: string,
) {
  if (!targetId) throw new ValidationError("Cible invalide.");
  await connectDB();
  const targetType = toDbType(type);
  const targetExists = targetType === "COMPANY"
    ? await Company.exists({ _id: targetId })
    : await User.exists({ _id: targetId, role: "CANDIDATE" });
  if (!targetExists) throw new ValidationError(type === "company" ? "Entreprise introuvable." : "Candidat introuvable.");
  if (targetType === "COMPANY" && await NetworkBlock.exists({ userId: user.id, companyId: targetId })) {
    throw new ValidationError("Débloquez cette entreprise avant de la suivre.");
  }
  const existing = await NetworkFollow.findOne({ userId: user.id, targetType, targetId }).select("_id").lean() as unknown as { _id: unknown } | null;

  if (existing) {
    await NetworkFollow.deleteOne({ _id: existing._id });
    return { following: false };
  }

  await NetworkFollow.create({ userId: user.id, targetType, targetId });
  return { following: true };
}

export async function toggleConnect(user: AuthUser, candidateId: string) {
  if (!candidateId || candidateId === user.id) {
    throw new ValidationError("Connexion impossible.");
  }

  await connectDB();
  const candidate = await User.exists({ _id: candidateId, role: "CANDIDATE" });
  if (!candidate) throw new ValidationError("Candidat introuvable.");
  const existing = await NetworkConnection.findOne({
    $or: [
      { requesterId: user.id, targetId: candidateId },
      { requesterId: candidateId, targetId: user.id },
    ],
  }).lean() as unknown as { _id: unknown; requesterId: string; targetId: string; status: string } | null;

  if (!existing) {
    await NetworkConnection.create({ requesterId: user.id, targetId: candidateId, status: "PENDING" });
    return { status: "pending" as const };
  }

  if (existing.status === "REJECTED") {
    await NetworkConnection.deleteOne({ _id: existing._id });
    await NetworkConnection.create({ requesterId: user.id, targetId: candidateId, status: "PENDING" });
    return { status: "pending" as const };
  }

  if (existing.status === "PENDING") {
    if (existing.targetId === user.id) throw new ValidationError("Cette personne vous a envoyé une invitation. Traitez-la dans l’onglet Réseau.");
    await NetworkConnection.findByIdAndDelete(existing._id);
    return { status: "none" as const };
  }

  // CONNECTED → remove
  await NetworkConnection.findByIdAndDelete(existing._id);
  return { status: "none" as const };
}

export async function respondToConnectionRequest(user: AuthUser, requesterId: string, accept: boolean) {
  await connectDB();
  const request = await NetworkConnection.findOne({ requesterId, targetId: user.id, status: "PENDING" }).lean() as { _id: unknown } | null;
  if (!request) throw new ValidationError("Cette invitation n’est plus disponible.");
  if (!accept) {
    await NetworkConnection.findByIdAndUpdate(request._id, { $set: { status: "REJECTED" } });
    return { status: "rejected" as const };
  }
  await NetworkConnection.findByIdAndUpdate(request._id, { $set: { status: "CONNECTED" } });
  await NetworkNotification.create({
    recipientId: requesterId,
    actorId: user.id,
    type: "CONNECTION_ACCEPTED",
    connectionId: String(request._id),
  });
  return { status: "connected" as const };
}

export async function connectToCompany(user: AuthUser, companyId: string) {
  if (user.role !== "CANDIDATE") throw new ValidationError("Seul un candidat peut envoyer une invitation à cette entreprise.");
  await connectDB();
  const company = await Company.findById(companyId).select("ownerEmail recruiterEmail").lean() as { ownerEmail?: string | null; recruiterEmail?: string | null } | null;
  if (!company) throw new ValidationError("Entreprise introuvable.");
  const email = company.ownerEmail || company.recruiterEmail;
  const owner = email ? await User.findOne({ email: email.toLowerCase(), role: "COMPANY" }).select("_id").lean() as { _id: unknown } | null : null;
  if (!owner) throw new ValidationError("Cette entreprise n’a pas encore relié sa page à un compte SmartApply.");
  const ownerId = String(owner._id);
  const existing = await NetworkConnection.findOne({ $or: [
    { requesterId: user.id, targetId: ownerId },
    { requesterId: ownerId, targetId: user.id },
  ] }).lean() as unknown as { _id: unknown; requesterId: string; targetId: string; status: string } | null;
  if (existing?.status === "CONNECTED") return { status: "connected" as const };
  if (existing?.status === "PENDING") {
    if (existing.requesterId === user.id) return { status: "pending" as const };
    throw new ValidationError("Cette entreprise vous a déjà envoyé une invitation. Consultez votre réseau.");
  }
  await NetworkConnection.create({ requesterId: user.id, targetId: ownerId, status: "PENDING" });
  return { status: "pending" as const };
}
