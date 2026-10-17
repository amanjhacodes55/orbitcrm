import { z } from "zod";
import { SCOPES } from "@/lib/models";

const url = z.string().trim().max(500).refine((v) => !v || /^https?:\/\//.test(v) || v.startsWith("/"), "URLs must start with https:// (or / for built-in demo apps)");
const Field = z.object({ key: z.string().regex(/^[a-z0-9_]{1,40}$/, "Field keys: lowercase letters, digits, _"), label: z.string().min(1).max(60), type: z.enum(["text", "number", "email", "phone", "textarea"]).default("text"), required: z.boolean().default(false) });
const key = z.string().regex(/^[a-z0-9_]{1,40}$/, "Keys: lowercase letters, digits, _");

export const AppInput = z.object({
  name: z.string().trim().min(2).max(60),
  tagline: z.string().max(120).default(""),
  description: z.string().max(5000).default(""),
  category: z.enum(["Telephony", "Productivity", "Marketing", "Sales", "Data enrichment", "Communication", "Other"]).default("Productivity"),
  icon: z.string().max(8).default("🧩"),
  website: url.default(""),
  supportEmail: z.string().max(120).default(""),
  scopes: z.array(z.enum(Object.keys(SCOPES) as [string, ...string[]])).default([]),
  redirectUrls: z.array(url).max(5).default([]),
  features: z.object({ settingsUrl: url.default(""), dialerUrl: url.default(""), itemPanelUrl: url.default("") }).default({}),
  triggers: z.array(z.object({ key, label: z.string().min(1).max(80), description: z.string().max(300).default(""), fields: z.array(Field).max(20).default([]) })).max(20).default([]),
  actions: z.array(z.object({ key, label: z.string().min(1).max(80), description: z.string().max(300).default(""), url, fields: z.array(Field).max(20).default([]) })).max(20).default([]),
});
