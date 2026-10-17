import { rid } from "@/lib/ids";

export const COLORS = ["#00c875", "#fdab3d", "#e2445c", "#579bfc", "#a25ddc", "#ff642e", "#037f4c", "#c4c4c4", "#ff158a", "#9cd326"];

const opt = (label: string, color: string) => ({ id: rid(4), label, color });
const col = (title: string, type: string, extra: Record<string, unknown> = {}) => ({ id: rid(5), title, type, width: 150, options: [], ...extra });
const grp = (title: string, color: string) => ({ id: rid(5), title, color, collapsed: false });

export type BoardTemplate = {
  kind: "leads" | "deals" | "contacts" | "companies" | "custom";
  name: string;
  icon: string;
  itemLabel: string;
  description: string;
  build: () => { columns: ReturnType<typeof col>[]; groups: ReturnType<typeof grp>[]; kanbanColumn: string };
};

export const TEMPLATES: Record<string, BoardTemplate> = {
  leads: {
    kind: "leads",
    name: "Leads",
    icon: "🎯",
    itemLabel: "Lead",
    description: "Capture and qualify new leads",
    build() {
      const status = col("Status", "status", {
        options: [opt("New", "#579bfc"), opt("Contacted", "#fdab3d"), opt("Qualified", "#00c875"), opt("Unqualified", "#e2445c"), opt("Nurturing", "#a25ddc")],
      });
      return {
        columns: [
          status,
          col("Owner", "person"),
          col("Email", "email", { width: 200 }),
          col("Phone", "phone"),
          col("Company", "text"),
          col("Source", "dropdown", { options: [opt("Website", "#579bfc"), opt("Referral", "#00c875"), opt("LinkedIn", "#0a66c2"), opt("Cold call", "#fdab3d"), opt("Event", "#a25ddc")] }),
          col("Lead score", "number"),
          col("Next follow-up", "date"),
        ],
        groups: [grp("New leads", "#579bfc"), grp("Working", "#fdab3d")],
        kanbanColumn: status.id,
      };
    },
  },
  deals: {
    kind: "deals",
    name: "Deals pipeline",
    icon: "💰",
    itemLabel: "Deal",
    description: "Track deals through your sales stages",
    build() {
      const stage = col("Stage", "status", {
        options: [opt("Discovery", "#579bfc"), opt("Proposal", "#fdab3d"), opt("Negotiation", "#a25ddc"), opt("Won", "#00c875"), opt("Lost", "#e2445c")],
      });
      return {
        columns: [stage, col("Owner", "person"), col("Value", "currency"), col("Close date", "date"), col("Contact", "text"), col("Phone", "phone"), col("Probability", "rating")],
        groups: [grp("Open deals", "#a25ddc"), grp("Closed", "#00c875")],
        kanbanColumn: stage.id,
      };
    },
  },
  contacts: {
    kind: "contacts",
    name: "Contacts",
    icon: "👥",
    itemLabel: "Contact",
    description: "People you work with",
    build() {
      const type = col("Type", "status", { options: [opt("Customer", "#00c875"), opt("Prospect", "#579bfc"), opt("Partner", "#a25ddc"), opt("Vendor", "#fdab3d")] });
      return {
        columns: [type, col("Email", "email", { width: 200 }), col("Phone", "phone"), col("Company", "text"), col("Title", "text"), col("LinkedIn", "link"), col("Subscribed", "checkbox")],
        groups: [grp("All contacts", "#579bfc")],
        kanbanColumn: type.id,
      };
    },
  },
  companies: {
    kind: "companies",
    name: "Companies",
    icon: "🏢",
    itemLabel: "Company",
    description: "Accounts and organisations",
    build() {
      const tier = col("Tier", "status", { options: [opt("Enterprise", "#a25ddc"), opt("Mid-market", "#579bfc"), opt("SMB", "#00c875")] });
      return {
        columns: [tier, col("Industry", "dropdown", { options: [opt("SaaS", "#579bfc"), opt("Finance", "#00c875"), opt("Retail", "#fdab3d"), opt("Healthcare", "#e2445c")] }), col("Website", "link"), col("Employees", "number"), col("Annual revenue", "currency"), col("Account owner", "person")],
        groups: [grp("Accounts", "#a25ddc")],
        kanbanColumn: tier.id,
      };
    },
  },
  custom: {
    kind: "custom",
    name: "New board",
    icon: "📋",
    itemLabel: "Item",
    description: "Start from scratch",
    build() {
      const status = col("Status", "status", { options: [opt("Working on it", "#fdab3d"), opt("Done", "#00c875"), opt("Stuck", "#e2445c")] });
      return { columns: [status, col("Owner", "person"), col("Due date", "date")], groups: [grp("Group 1", "#579bfc")], kanbanColumn: status.id };
    },
  },
};
