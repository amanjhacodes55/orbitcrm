import { Schema, model, models, type Model, type InferSchemaType, Types } from "mongoose";

const opts = { timestamps: true } as const;
function m<T extends Schema>(name: string, schema: T): Model<InferSchemaType<T>> {
  return (models[name] as Model<InferSchemaType<T>>) || model(name, schema);
}

// ---------- identity ----------
const UserSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, select: false },
    image: { type: String, default: "" },
    providers: { type: [String], default: [] },
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace" }, // currently selected workspace
    theme: { type: String, default: "" }, // UI theme, follows the user across devices
  },
  opts
);
export const User = m("User", UserSchema);

const WorkspaceSchema = new Schema(
  {
    name: { type: String, required: true, maxlength: 80 },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ _id: false, user: { type: Schema.Types.ObjectId, ref: "User" }, role: { type: String, enum: ["owner", "admin", "member"], default: "member" } }],
    inviteCode: { type: String, index: true },
  },
  opts
);
WorkspaceSchema.index({ "members.user": 1 });
export const Workspace = m("Workspace", WorkspaceSchema);

// ---------- boards ----------
export const COLUMN_TYPES = ["text", "status", "person", "date", "number", "currency", "email", "phone", "dropdown", "checkbox", "link", "rating", "relation"] as const;
export type ColumnType = (typeof COLUMN_TYPES)[number];

const OptionSchema = new Schema({ id: { type: String, required: true }, label: { type: String, required: true }, color: { type: String, required: true } }, { _id: false });
const ColumnSchema = new Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, enum: COLUMN_TYPES, required: true },
    width: { type: Number, default: 150 },
    options: { type: [OptionSchema], default: [] },
    relationBoard: { type: String, default: "" }, // for "relation" columns: the linked board id
  },
  { _id: false }
);
const GroupSchema = new Schema({ id: String, title: String, color: String, collapsed: { type: Boolean, default: false } }, { _id: false });

const BoardSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, maxlength: 80 },
    description: { type: String, default: "" },
    icon: { type: String, default: "📋" },
    kind: { type: String, enum: ["leads", "deals", "contacts", "companies", "custom"], default: "custom" },
    itemLabel: { type: String, default: "Item" },
    columns: { type: [ColumnSchema], default: [] },
    groups: { type: [GroupSchema], default: [] },
    kanbanColumn: { type: String, default: "" }, // status column used by the kanban view
    views: {
      type: [
        {
          _id: false,
          id: String,
          name: String,
          type: { type: String, enum: ["table", "kanban", "calendar"], default: "table" },
          filters: { type: [{ _id: false, column: String, op: String, value: Schema.Types.Mixed }], default: [] },
          match: { type: String, enum: ["all", "any"], default: "all" },
          sort: { column: { type: String, default: "" }, dir: { type: String, default: "asc" } },
          hidden: { type: [String], default: [] },
          kanbanColumn: { type: String, default: "" },
          dateColumn: { type: String, default: "" },
        },
      ],
      default: [],
    },
    position: { type: Number, default: 0 },
  },
  opts
);
export const Board = m("Board", BoardSchema);

const ItemSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    board: { type: Schema.Types.ObjectId, ref: "Board", required: true },
    group: { type: String, required: true },
    name: { type: String, required: true, maxlength: 200 },
    values: { type: Schema.Types.Mixed, default: {} },
    position: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    source: { type: String, default: "web" }, // web | api | automation | webhook | app:<slug>
  },
  { ...opts, minimize: false }
);
ItemSchema.index({ board: 1, group: 1, position: 1 });
ItemSchema.index({ workspace: 1, updatedAt: -1 });
export const Item = m("Item", ItemSchema);

const ActivitySchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    board: { type: Schema.Types.ObjectId, ref: "Board" },
    item: { type: Schema.Types.ObjectId, ref: "Item", index: true },
    type: { type: String, enum: ["created", "update", "note", "call", "email", "automation", "app", "task", "message"], required: true },
    due: { type: Date }, // tasks
    done: { type: Boolean, default: false }, // tasks
    assignee: { type: Schema.Types.ObjectId, ref: "User" }, // tasks
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorLabel: { type: String, default: "" }, // e.g. "Automation", "Softphone app"
    text: { type: String, default: "" },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  opts
);
ActivitySchema.index({ workspace: 1, createdAt: -1 });
ActivitySchema.index({ workspace: 1, type: 1, done: 1, due: 1 });
export const Activity = m("Activity", ActivitySchema);

// ---------- automation & integrations ----------
const AutomationSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    board: { type: Schema.Types.ObjectId, ref: "Board", required: true },
    name: { type: String, required: true, maxlength: 120 },
    enabled: { type: Boolean, default: true },
    trigger: { type: { type: String, required: true }, config: { type: Schema.Types.Mixed, default: {} } },
    conditions: { type: [{ _id: false, column: String, op: String, value: Schema.Types.Mixed }], default: [] },
    actions: { type: [{ _id: false, type: { type: String }, config: { type: Schema.Types.Mixed, default: {} } }], default: [] },
    hookToken: { type: String, index: true, sparse: true }, // catch-hook URL token
    runCount: { type: Number, default: 0 },
    lastRunAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  opts
);
export const Automation = m("Automation", AutomationSchema);

const RunSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", index: true },
    automation: { type: Schema.Types.ObjectId, ref: "Automation", index: true },
    status: { type: String, enum: ["success", "failed", "skipped"], required: true },
    trigger: { type: String },
    item: { type: Schema.Types.ObjectId, ref: "Item" },
    steps: { type: [{ _id: false, action: String, ok: Boolean, detail: String }], default: [] },
    durationMs: Number,
  },
  opts
);
RunSchema.index({ createdAt: 1 }, { expireAfterSeconds: 14 * 24 * 3600 });
export const AutomationRun = m("AutomationRun", RunSchema);

const WebhookSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    url: { type: String, required: true },
    events: { type: [String], default: [] },
    board: { type: Schema.Types.ObjectId, ref: "Board" }, // optional filter
    secret: { type: String, required: true },
    active: { type: Boolean, default: true },
    installation: { type: Schema.Types.ObjectId, ref: "Installation" }, // set when created by an app
    lastStatus: Number,
    lastDeliveryAt: Date,
    failures: { type: Number, default: 0 },
  },
  opts
);
export const Webhook = m("Webhook", WebhookSchema);

const DeliverySchema = new Schema(
  { webhook: { type: Schema.Types.ObjectId, ref: "Webhook", index: true }, event: String, status: Number, ok: Boolean, durationMs: Number, error: String },
  opts
);
DeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 3600 });
export const WebhookDelivery = m("WebhookDelivery", DeliverySchema);

const ApiKeySchema = new Schema(
  { workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true }, name: String, prefix: String, hash: { type: String, index: true }, createdBy: { type: Schema.Types.ObjectId, ref: "User" }, lastUsedAt: Date },
  opts
);
export const ApiKey = m("ApiKey", ApiKeySchema);

// ---------- developer platform ----------
export const SCOPES = {
  "boards.read": "Read boards and their columns",
  "items.read": "Read items (leads, deals, contacts…)",
  "items.write": "Create and update items",
  "activities.write": "Log calls, notes and activities",
  "webhooks.write": "Subscribe to CRM events",
  "triggers.fire": "Fire this app's automation triggers",
} as const;

const FieldSchema = new Schema({ key: String, label: String, type: { type: String, default: "text" }, required: { type: Boolean, default: false } }, { _id: false });

const AppSchema = new Schema(
  {
    developer: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true },
    tagline: { type: String, default: "", maxlength: 120 },
    description: { type: String, default: "", maxlength: 5000 },
    category: { type: String, default: "Productivity" },
    icon: { type: String, default: "🧩" },
    website: { type: String, default: "" },
    supportEmail: { type: String, default: "" },
    scopes: { type: [String], default: [] },
    clientId: { type: String, required: true, unique: true },
    clientSecretHash: { type: String, select: false },
    signingSecret: { type: String, select: false }, // HMAC key for requests we send to the app
    redirectUrls: { type: [String], default: [] },
    features: {
      settingsUrl: { type: String, default: "" },
      dialerUrl: { type: String, default: "" },
      itemPanelUrl: { type: String, default: "" },
    },
    triggers: { type: [{ _id: false, key: String, label: String, description: String, fields: [FieldSchema] }], default: [] },
    actions: { type: [{ _id: false, key: String, label: String, description: String, url: String, fields: [FieldSchema] }], default: [] },
    status: { type: String, enum: ["draft", "in_review", "approved", "rejected"], default: "draft", index: true },
    reviewNotes: { type: String, default: "" },
    installs: { type: Number, default: 0 },
    official: { type: Boolean, default: false },
  },
  opts
);
export const App = m("App", AppSchema);

const InstallationSchema = new Schema(
  {
    app: { type: Schema.Types.ObjectId, ref: "App", required: true },
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    installedBy: { type: Schema.Types.ObjectId, ref: "User" },
    scopes: { type: [String], default: [] },
    tokenHash: { type: String, index: true, select: false },
    tokenPrefix: String,
    settings: { type: Schema.Types.Mixed, default: {} },
    active: { type: Boolean, default: true },
  },
  { ...opts, minimize: false }
);
InstallationSchema.index({ app: 1, workspace: 1 }, { unique: true });
export const Installation = m("Installation", InstallationSchema);

const OAuthCodeSchema = new Schema(
  { code: { type: String, unique: true }, installation: { type: Schema.Types.ObjectId, ref: "Installation" }, app: { type: Schema.Types.ObjectId, ref: "App" }, token: String, used: { type: Boolean, default: false } },
  opts
);
OAuthCodeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });
export const OAuthCode = m("OAuthCode", OAuthCodeSchema);

const NotificationSchema = new Schema(
  { user: { type: Schema.Types.ObjectId, ref: "User", index: true }, workspace: { type: Schema.Types.ObjectId, ref: "Workspace" }, text: String, link: String, read: { type: Boolean, default: false } },
  opts
);
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 3600 });
export const Notification = m("Notification", NotificationSchema);

// ---------- channels / inbox ----------
export const CHANNEL_TYPES = ["webchat", "email", "sms", "whatsapp", "custom"] as const;
const ChannelSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    type: { type: String, enum: CHANNEL_TYPES, required: true },
    name: { type: String, required: true, maxlength: 60 },
    token: { type: String, required: true, unique: true }, // public id used in widget / inbound URLs
    active: { type: Boolean, default: true },
    settings: {
      color: { type: String, default: "#6161ff" },
      greeting: { type: String, default: "Hi! 👋 How can we help you today?" },
      leadBoard: { type: String, default: "" }, // board where new contacts become items
      autoCreateLead: { type: Boolean, default: true },
      outboundWebhookUrl: { type: String, default: "" }, // sms/whatsapp/custom: we POST replies here
      fromEmail: { type: String, default: "" },
      twilioSid: { type: String, default: "" },
      twilioFrom: { type: String, default: "" },
    },
    twilioToken: { type: String, select: false, default: "" },
    signingSecret: { type: String, select: false },
  },
  opts
);
export const Channel = m("Channel", ChannelSchema);

const ConversationSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    channel: { type: Schema.Types.ObjectId, ref: "Channel", required: true },
    contact: { name: { type: String, default: "" }, email: { type: String, default: "" }, phone: { type: String, default: "" }, key: { type: String, default: "" } },
    subject: { type: String, default: "" },
    item: { type: Schema.Types.ObjectId, ref: "Item" },
    board: { type: Schema.Types.ObjectId, ref: "Board" },
    status: { type: String, enum: ["open", "pending", "closed"], default: "open" },
    assignee: { type: Schema.Types.ObjectId, ref: "User" },
    lastMessage: { type: String, default: "" },
    lastMessageAt: { type: Date, default: Date.now },
    unread: { type: Number, default: 0 },
    visitorTokenHash: { type: String, select: false }, // webchat visitor session
  },
  opts
);
ConversationSchema.index({ workspace: 1, status: 1, lastMessageAt: -1 });
ConversationSchema.index({ channel: 1, "contact.key": 1 });
export const Conversation = m("Conversation", ConversationSchema);

const MessageSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    conversation: { type: Schema.Types.ObjectId, ref: "Conversation", required: true },
    direction: { type: String, enum: ["in", "out", "note"], required: true },
    author: { type: Schema.Types.ObjectId, ref: "User" },
    authorLabel: { type: String, default: "" },
    text: { type: String, required: true, maxlength: 10000 },
    delivery: { type: String, default: "" }, // sent | failed: reason | stored
    subject: { type: String, default: "" }, // email only
    to: { type: String, default: "" },
    cc: { type: String, default: "" },
  },
  opts
);
MessageSchema.index({ conversation: 1, createdAt: 1 });
export const Message = m("Message", MessageSchema);

export { Types };
