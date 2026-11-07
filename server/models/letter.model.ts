import { mongoose } from "@/server/lib/mongodb";
const { Schema, model, models } = mongoose;

const ApplicationLetterSchema = new Schema(
  {
    applicationId: { type: String, default: null, index: true },
    targetType: { type: String, enum: ["APPLICATION", "JOB"], default: "APPLICATION", index: true },
    userId: { type: String, required: true, index: true },
    jobId: { type: String, required: true },
    language: { type: String, enum: ["FR", "EN"], default: "FR" },
    subject: { type: String, default: "" },
    body: { type: String, default: "" },
    source: { type: String, enum: ["AI", "TEMPLATE"], default: "TEMPLATE" },
    status: { type: String, enum: ["DRAFT", "READY", "GMAIL_OPENED", "SENT", "FAILED"], default: "DRAFT" },
    warnings: { type: [String], default: [] },
    recipient: { type: String, default: null },
    sentAt: { type: Date, default: null },
    gmailOpenedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "application_letters" }
);
ApplicationLetterSchema.index({ userId: 1, updatedAt: -1 });

const LetterUsageEventSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    kind: { type: String, enum: ["GENERATE", "SEND"], required: true },
  },
  { timestamps: true, collection: "letter_usage_events" }
);
LetterUsageEventSchema.index({ userId: 1, kind: 1, createdAt: -1 });

export const ApplicationLetter = models.ApplicationLetter || model("ApplicationLetter", ApplicationLetterSchema);
export const LetterUsageEvent = models.LetterUsageEvent || model("LetterUsageEvent", LetterUsageEventSchema);
