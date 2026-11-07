import { mongoose } from "@/server/lib/mongodb";

const { Schema, model, models } = mongoose;

const UserSchema = new Schema(
  {
    _id: { type: String, default: () => new mongoose.Types.ObjectId().toHexString() },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, default: "" },
    role: { type: String, enum: ["CANDIDATE", "COMPANY", "ADMIN"], default: "CANDIDATE" },
    plan: { type: String, enum: ["FREE", "PREMIUM"], default: "FREE" },
    lastSeenAt: { type: Date, default: null, index: true },
  },
  { timestamps: true, collection: "users" },
);

if (models.User && !models.User.schema.path("lastSeenAt")) {
  delete models.User;
}

export const User = models.User || model("User", UserSchema);
