import { mongoose } from "@/server/lib/mongodb";

const { Schema, model, models } = mongoose;

const PostTagSchema = new Schema({ tag: String }, { _id: false });

const PostSchema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toHexString() },
    authorId: { type: String, required: true, index: true },
    companyId: { type: String, default: null, index: true },
    jobId: { type: String, default: null },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    excerpt: { type: String, default: "" },
    category: { type: String, enum: ["COMPANY_ANNOUNCEMENT","JOB_OPENING","INTERNSHIP_ANNOUNCEMENT","PFE_ANNOUNCEMENT","OPEN_DAY","RECRUITMENT_NEWS","CAREER_ADVICE","WORKSHOP","COMPANY_LIFE","TESTIMONIAL","SCHOLARSHIP","CAMPUS_NEWS"], default: "COMPANY_ANNOUNCEMENT" },
    language: { type: String, enum: ["FR", "EN"], default: "FR" },
    source: { type: String, enum: ["MANUAL", "IMPORTED"], default: "MANUAL" },
    sourceUrl: { type: String, default: null },
    sourceName: { type: String, default: null },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED", "REMOVED"], default: "DRAFT", index: true },
    postKind: { type: String, enum: ["TEXT", "PHOTO", "VIDEO", "DOCUMENT", "POLL", "JOB", "EVENT", "ARTICLE", "CELEBRATION"], default: "TEXT" },
    visibility: { type: String, enum: ["PUBLIC", "MEMBERS"], default: "PUBLIC" },
    commentMode: { type: String, enum: ["ANYONE", "CONNECTIONS", "NONE"], default: "ANYONE" },
    media: { type: Schema.Types.Mixed, default: null },
    poll: { type: Schema.Types.Mixed, default: null },
    event: { type: Schema.Types.Mixed, default: null },
    celebration: { type: Schema.Types.Mixed, default: null },
    jobDetails: { type: Schema.Types.Mixed, default: null },
    tags: { type: [PostTagSchema], default: [] },
    publishedAt: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "posts" }
);

PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ authorId: 1, status: 1 });

export const Post = models.Post || model("Post", PostSchema);
