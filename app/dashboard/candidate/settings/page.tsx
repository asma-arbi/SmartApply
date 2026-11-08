import { redirect } from "next/navigation";
import { getSessionUser, listActiveSessions } from "@/lib/auth/session";
import { getDb } from "@/lib/mongodb";
import { User, Profile } from "@/lib/models/types";
import CandidateSettingsClient from "./CandidateSettingsClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: {
    tab?: string;
    success?: string;
    error?: string;
  };
}

export default async function CandidateSettingsPage({ searchParams }: PageProps) {
  const sessionData = await getSessionUser();
  if (!sessionData) {
    redirect("/login?revoked=1");
  }

  const db = await getDb();
  const userId = sessionData.user.id;

  const [user, profileDoc, sessions] = await Promise.all([
    db.collection<User>("users").findOne({ id: userId }),
    db.collection<Profile>("profiles").findOne({ id: userId }),
    listActiveSessions(userId),
  ]);

  if (!user) {
    redirect("/login?revoked=1");
  }

  const profile: Profile = profileDoc || {
    id: userId,
    role: "candidat",
    full_name: user.name || "",
    email: user.email,
    language: "fr",
    notifications_enabled: true,
    visible_to_companies: true,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };

  return (
    <CandidateSettingsClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        auth_provider: user.auth_provider || "email",
      }}
      profile={profile}
      sessions={sessions}
      initialTab={searchParams?.tab || "profile"}
      successParam={searchParams?.success}
      errorParam={searchParams?.error}
    />
  );
}
