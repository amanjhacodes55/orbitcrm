import { createHash, randomBytes } from "node:crypto";

export const rid = (n = 6) => randomBytes(n).toString("base64url").replace(/[-_]/g, "").slice(0, n + 2);
export const token = (prefix: string, bytes = 24) => `${prefix}_${randomBytes(bytes).toString("base64url")}`;
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "app";
