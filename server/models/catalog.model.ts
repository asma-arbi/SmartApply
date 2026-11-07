import { mongoose } from "@/server/lib/mongodb";
const { Schema, model, models } = mongoose;

const CompanySchema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toHexString() },
    name: { type: String, required: true },
    city: { type: String, default: "" },
    sector: { type: String, default: "" },
    logoUrl: { type: String, default: null },
    coverUrl: { type: String, default: null },
    isClaimed: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
    recruiterEmail: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    websiteUrl: { type: String, default: "" },
    ownerEmail: { type: String, default: null },
  },
  { timestamps: true, collection: "companies" }
);
CompanySchema.index({ name: "text", city: "text", sector: "text" });
CompanySchema.index({ isVerified: 1 });

const JobSchema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toHexString() },
    companyId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    city: { type: String, default: "" },
    type: { type: String, enum: ["CDI", "STAGE", "PFE"], default: "CDI" },
    language: { type: String, enum: ["FR", "EN"], default: "FR" },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "CLOSED", "ARCHIVED"], default: "DRAFT", index: true },
    description: { type: String, default: "" },
    requirements: { type: [String], default: [] },
  },
  { timestamps: true, collection: "jobs" }
);
JobSchema.index({ title: "text", city: "text" });

const ApplicationSchema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toHexString() },
    ownerEmail: { type: String, required: true, index: true },
    jobId: { type: String, required: true },
    status: { type: String, enum: ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"], default: "PENDING" },
  },
  { timestamps: true, collection: "applications" }
);

const CandidateProfileSchema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toHexString() },
    email: { type: String, required: true, unique: true },
    fullName: { type: String, default: "" },
    city: { type: String, default: "" },
    headline: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 1200 },
    avatarUrl: { type: String, default: null },
    coverUrl: { type: String, default: null },
    skills: { type: [String], default: [] },
    education: { type: [String], default: [] },
    experiences: { type: Schema.Types.Mixed, default: [] },
    languages: { type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: true, collection: "candidate_profiles" }
);

export const Company = models.Company || model("Company", CompanySchema);
export const Job = models.Job || model("Job", JobSchema);
export const Application = models.Application || model("Application", ApplicationSchema);
export const CandidateProfile = models.CandidateProfile || model("CandidateProfile", CandidateProfileSchema);
