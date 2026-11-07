import { mongoose } from "@/server/lib/mongodb";

const { Schema, model, models } = mongoose;

const AuthSessionSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
  },
  { timestamps: true, collection: "auth_sessions" },
);

export const AuthSession = models.AuthSession || model("AuthSession", AuthSessionSchema);
