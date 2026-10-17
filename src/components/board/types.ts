export type Opt = { id: string; label: string; color: string };
export type Column = { id: string; title: string; type: string; width: number; options: Opt[] };
export type Group = { id: string; title: string; color: string; collapsed?: boolean };
export type BoardT = { _id: string; name: string; icon: string; description: string; kind: string; itemLabel: string; columns: Column[]; groups: Group[]; kanbanColumn: string };
export type ItemT = { _id: string; name: string; group: string; values: Record<string, unknown>; position: number; createdAt: string; updatedAt: string; source?: string };
export type Member = { id: string; name: string; email: string; image: string; role: string };
export type PanelApp = { installationId: string; name: string; icon: string; url: string };
