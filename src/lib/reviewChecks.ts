/** Automated checks before an app can be submitted / approved. */
type A = {
  name: string; tagline?: string | null; description?: string | null; icon?: string | null; scopes: string[]; redirectUrls: string[];
  features?: { settingsUrl?: string | null; dialerUrl?: string | null; itemPanelUrl?: string | null } | null;
  triggers: { key?: string | null }[]; actions: { key?: string | null; url?: string | null }[]; supportEmail?: string | null;
};
export function appChecks(a: A) {
  const f = a.features || {};
  const hasFeature = !!(f.settingsUrl || f.dialerUrl || f.itemPanelUrl || a.triggers.length || a.actions.length || a.redirectUrls.length);
  const checks = [
    { name: "Listing has a tagline", ok: (a.tagline || "").length >= 10 },
    { name: "Description is at least 80 characters", ok: (a.description || "").length >= 80 },
    { name: "Support email provided", ok: /.+@.+\..+/.test(a.supportEmail || "") },
    { name: "App provides at least one capability (dialer, settings, panel, trigger, action or OAuth)", ok: hasFeature },
    { name: "Requests at least one scope", ok: a.scopes.length > 0 },
    { name: "Every action has an endpoint URL", ok: a.actions.every((x) => !!x.url) },
    { name: "Dialer apps request activities.write", ok: !f.dialerUrl || a.scopes.includes("activities.write") },
    { name: "Apps with triggers request triggers.fire", ok: a.triggers.length === 0 || a.scopes.includes("triggers.fire") },
    { name: "Trigger/action keys are unique", ok: new Set(a.triggers.map((t) => t.key)).size === a.triggers.length && new Set(a.actions.map((t) => t.key)).size === a.actions.length },
  ];
  return { checks, ok: checks.every((c) => c.ok) };
}
