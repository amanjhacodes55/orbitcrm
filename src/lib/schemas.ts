import { z } from "zod";
import { ACTIONS, TRIGGERS } from "@/lib/automation";

export const AutoBody = z.object({
  board: z.string(),
  name: z.string().trim().min(1).max(120),
  enabled: z.boolean().default(true),
  trigger: z.object({ type: z.enum(Object.keys(TRIGGERS) as [string, ...string[]]), config: z.record(z.unknown()).default({}) }),
  conditions: z.array(z.object({ column: z.string(), op: z.enum(["equals", "not_equals", "contains", "is_empty", "not_empty", "gt", "lt"]), value: z.unknown().optional() })).max(10).default([]),
  actions: z.array(z.object({ type: z.enum(Object.keys(ACTIONS) as [string, ...string[]]), config: z.record(z.unknown()).default({}) })).min(1, "Add at least one action").max(10),
});

