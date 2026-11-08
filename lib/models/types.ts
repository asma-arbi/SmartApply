import { ObjectId } from "mongodb";

export type UserRole = "candidat" | "entreprise" | "admin";

export interface User {
  _id?: ObjectId;
  id: string; // Identifiant unique (UUID ou string)
  email: string;
  password_hash: string;
  name: string;
  role: UserRole;
  company_name?: string;
  google_id?: string;
  avatar_url?: string;
  auth_provider?: "email" | "google";
  created_at: string;
  updated_at: string;
  reset_token?: string | null;
  reset_token_expires?: string | null;
}

export interface Profile {
  _id?: ObjectId;
  id: string; // Correspond au user.id
  role: UserRole;
  full_name: string;
  email: string;
  title?: string; // ex: "Étudiant Ingénieur en Informatique"
  phone?: string;
  city?: string; // ex: "Tunis, Ariana"
  school?: string; // ex: "ESPRIT"
  education_level?: string; // ex: "5ème année Ingénieur (PFE)"
  bio?: string;
  skills?: string[]; // ex: ["Next.js", "React", "TypeScript", "Node.js", "MongoDB"]
  github_url?: string;
  linkedin_url?: string;
  portfolio_url?: string;
  availability?: string; // ex: "Stage PFE (Février 2027)"
  language: "fr" | "en";
  notifications_enabled: boolean;
  visible_to_companies: boolean;
  created_at: string;
  updated_at: string;
}

export type CompanyStatus = "pending" | "verified" | "rejected";

export interface Company {
  _id?: ObjectId;
  id: string; // Correspond au user.id
  name: string;
  sector?: string | null;
  size?: "1-10" | "11-50" | "51-200" | "201-500" | "500+" | null;
  city?: string | null;
  logo_url?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  phone?: string | null;
  description?: string | null;
  status: CompanyStatus;
  rejection_reason?: string | null;
  created_at: string;
  updated_at?: string;
}

export type JobStatus = "draft" | "published" | "closed";

export interface Job {
  _id?: ObjectId;
  id: string; // UUID de l'offre
  company_id: string; // id de l'entreprise
  title: string;
  location: string;
  type: string; // CDI, CDD, Stage PFE, Freelance...
  description: string;
  status: JobStatus;
  created_at: string;
  updated_at?: string;
  companies?: {
    name: string;
    logo_url?: string | null;
    city?: string | null;
  };
}

export interface Session {
  _id?: ObjectId;
  id: string; // ID unique de session (sid)
  user_id: string;
  user_agent: string; // Appareil / navigateur
  ip: string;
  refresh_token_hash: string;
  created_at: string;
  last_active_at: string;
  expires_at: string; // Expiration absolue (ex: 30 jours)
  revoked_at?: string | null;
}

export interface ConsentRecord {
  _id?: ObjectId;
  id: string;
  user_id: string;
  tos_version: string;
  privacy_version: string;
  ai_cv_consent: boolean;
  consented_at: string;
}
