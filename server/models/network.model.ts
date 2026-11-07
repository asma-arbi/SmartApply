import { mongoose } from "@/server/lib/mongodb";
const { Schema, model, models } = mongoose;

const NetworkFollowSchema = new Schema(
  {
    userId: { type: String, required: true },
    targetType: { type: String, enum: ["COMPANY", "CANDIDATE"], required: true },
    targetId: { type: String, required: true },
  },
  { timestamps: true, collection: "network_follows" }
);
NetworkFollowSchema.index({ userId: 1, targetType: 1, targetId: 1 }, { unique: true });

const NetworkConnectionSchema = new Schema(
  {
    requesterId: { type: String, required: true },
    targetId: { type: String, required: true },
    status: { type: String, enum: ["PENDING", "CONNECTED", "REJECTED"], default: "PENDING" },
  },
  { timestamps: true, collection: "network_connections" }
);
NetworkConnectionSchema.index({ requesterId: 1, targetId: 1 });
NetworkConnectionSchema.index({ targetId: 1 });

const NetworkBlockSchema = new Schema(
  {
    userId: { type: String, required: true },
    companyId: { type: String, required: true },
  },
  { timestamps: true, collection: "network_blocks" },
);
NetworkBlockSchema.index({ userId: 1, companyId: 1 }, { unique: true });

const NetworkNotificationSchema = new Schema(
  {
    recipientId: { type: String, required: true, index: true },
    actorId: { type: String, required: true },
    type: { type: String, enum: ["CONNECTION_ACCEPTED"], required: true },
    connectionId: { type: String, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "network_notifications" },
);
NetworkNotificationSchema.index({ recipientId: 1, createdAt: -1 });

const ConversationSchema = new Schema(
  {
    participantKey: { type: String, required: true, unique: true },
    participantIds: { type: [String], required: true },
    lastMessage: { type: String, default: "" },
    lastSenderId: { type: String, default: null },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "conversations" },
);

const DirectMessageSchema = new Schema(
  {
    conversationId: { type: String, required: true, index: true },
    senderId: { type: String, required: true },
    body: { type: String, default: "", maxlength: 4000 },
    attachments: {
      type: [{ fileId: { type: String, required: true }, name: { type: String, required: true }, type: { type: String, enum: ["image", "document"], required: true }, size: { type: Number, required: true } }],
      default: [],
    },
    reactions: {
      type: [{ userId: { type: String, required: true }, emoji: { type: String, required: true } }],
      default: [],
    },
    editedAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "direct_messages" },
);
DirectMessageSchema.index({ conversationId: 1, createdAt: 1 });

// Refresh the expanded schema during dev HMR; otherwise Mongo-backed file-only
// messages keep using the previously registered required-body model.
if (models.DirectMessage && (!models.DirectMessage.schema.path("attachments") || models.DirectMessage.schema.path("body")?.isRequired)) {
  delete models.DirectMessage;
}

const MessageAttachmentSchema = new Schema(
  {
    conversationId: { type: String, required: true, index: true },
    ownerId: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 180 },
    type: { type: String, enum: ["image", "document"], required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    content: { type: Schema.Types.Buffer, required: true, select: false },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  },
  { timestamps: true, collection: "message_attachments" },
);
MessageAttachmentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const NetworkFollow = models.NetworkFollow || model("NetworkFollow", NetworkFollowSchema);
export const NetworkConnection = models.NetworkConnection || model("NetworkConnection", NetworkConnectionSchema);
export const NetworkBlock = models.NetworkBlock || model("NetworkBlock", NetworkBlockSchema);
export const NetworkNotification = models.NetworkNotification || model("NetworkNotification", NetworkNotificationSchema);
export const Conversation = models.Conversation || model("Conversation", ConversationSchema);
export const DirectMessage = models.DirectMessage || model("DirectMessage", DirectMessageSchema);
export const MessageAttachment = models.MessageAttachment || model("MessageAttachment", MessageAttachmentSchema);
