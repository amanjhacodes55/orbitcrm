import "server-only";
import { App, Automation, Board, Item, Activity, User, Channel, Conversation, Message } from "@/lib/models";
import { TEMPLATES } from "@/lib/templates";
import { sha256, token } from "@/lib/ids";
import { installApp } from "@/lib/install";

const LABS_EMAIL = "labs@orbitcrm.local";

/** Built-in reference apps by "Orbit Labs" (served by this same server under /demo-apps). */
export async function ensureDemoApps() {
  let labs = await User.findOne({ email: LABS_EMAIL });
  if (!labs) labs = await User.create({ name: "Orbit Labs", email: LABS_EMAIL, providers: [] });
  const defs = [
    {
      slug: "softphone",
      name: "Softphone",
      icon: "📞",
      category: "Telephony",
      tagline: "Call leads from the browser and log every call automatically",
      description:
        "A reference dialer app built on the OrbitCRM Calling SDK. Click any phone number in the CRM to open the softphone, place the call, pick an outcome and the call is logged to the item's timeline with its duration. It also fires the “Call ended” trigger so you can automate follow-ups (e.g. set status to Contacted after an answered call).",
      scopes: ["items.read", "activities.write", "triggers.fire"],
      features: { dialerUrl: "/demo-apps/softphone", settingsUrl: "/demo-apps/softphone/settings", itemPanelUrl: "" },
      triggers: [{ key: "call_ended", label: "Call ended", description: "Fires after a call is logged", fields: [{ key: "outcome", label: "Outcome", type: "text", required: false }, { key: "duration", label: "Duration (s)", type: "number", required: false }] }],
      actions: [],
    },
    {
      slug: "lead-scorer",
      name: "Lead Scorer",
      icon: "📈",
      category: "Data enrichment",
      tagline: "Score every lead 0–100 from email domain, company and source",
      description:
        "A reference app that exposes an automation ACTION. Add “Run an app action → Lead Scorer → Score lead” to any automation and map the returned score into a number column. The scoring weights (free-mail penalty, preferred sources) are configurable in the app's settings page, which is embedded in OrbitCRM through the App SDK.",
      scopes: ["items.read", "items.write"],
      features: { dialerUrl: "", settingsUrl: "/demo-apps/lead-scorer", itemPanelUrl: "/demo-apps/lead-scorer/panel" },
      triggers: [],
      actions: [
        {
          key: "score_lead",
          label: "Score lead",
          description: "Returns { score, grade, reason }",
          url: "/api/demo-apps/lead-scorer/score",
          fields: [{ key: "email", label: "Email", type: "email", required: true }, { key: "company", label: "Company", type: "text", required: false }, { key: "source", label: "Source", type: "text", required: false }],
        },
      ],
    },
  ];
  for (const d of defs) {
    const exists = await App.findOne({ slug: d.slug });
    if (exists) {
      await App.updateOne({ _id: exists._id }, { $set: { ...d, status: "approved", official: true } });
      continue;
    }
    await App.create({ ...d, developer: labs._id, status: "approved", official: true, supportEmail: "labs@orbitcrm.local", website: "https://github.com/amanjhacodes55/orbitcrm", clientId: token("orb_client", 10), clientSecretHash: sha256(token("x")), signingSecret: token("orb_sign", 18) });
  }
}

const people = [
  ["Priya Sharma", "priya@finedge.in", "+91 98100 22334", "FinEdge"],
  ["Rahul Verma", "rahul.verma@gmail.com", "+91 99887 66554", "Freelancer"],
  ["Ananya Iyer", "ananya@cloudnest.io", "+91 90123 45678", "CloudNest"],
  ["Vikram Singh", "vikram@retailkart.com", "+91 98765 43210", "RetailKart"],
  ["Sneha Kapoor", "sneha@healthplus.org", "+91 91234 56780", "HealthPlus"],
  ["Arjun Mehta", "arjun@growthlabs.co", "+91 93456 78901", "GrowthLabs"],
  ["Kavya Nair", "kavya.nair@yahoo.com", "+91 94567 89012", "—"],
  ["Rohan Gupta", "rohan@datawise.ai", "+91 95678 90123", "DataWise AI"],
];

export async function seedSampleData(workspace: string, userId: string) {
  await ensureDemoApps();
  const mk = async (key: keyof typeof TEMPLATES, position: number) => {
    const t = TEMPLATES[key];
    return Board.create({ workspace, name: t.name, icon: t.icon, kind: t.kind, itemLabel: t.itemLabel, description: t.description, position, ...t.build() });
  };
  const leads = await mk("leads", 0);
  const deals = await mk("deals", 1);
  const contacts = await mk("contacts", 2);
  const col = (b: typeof leads, title: string) => b.columns.find((c) => c.title === title)!;
  const optId = (b: typeof leads, title: string, label: string) => col(b, title).options.find((o) => o.label === label)?.id;

  const statuses = ["New", "Contacted", "Qualified", "New", "Nurturing", "Contacted", "Unqualified", "New"];
  const sources = ["Website", "Referral", "LinkedIn", "Website", "Event", "Cold call", "Website", "LinkedIn"];
  const leadDocs = people.map(([name, email, phone, company], i) => ({
    workspace, board: leads._id, group: leads.groups[i < 4 ? 0 : 1].id, name, position: i, createdBy: userId, source: "sample",
    values: {
      [col(leads, "Status").id]: optId(leads, "Status", statuses[i]),
      [col(leads, "Owner").id]: userId,
      [col(leads, "Email").id]: email,
      [col(leads, "Phone").id]: phone,
      [col(leads, "Company").id]: company,
      [col(leads, "Source").id]: optId(leads, "Source", sources[i]),
      [col(leads, "Next follow-up").id]: new Date(Date.now() + (i - 2) * 86400000).toISOString().slice(0, 10),
    },
  }));
  const createdLeads = await Item.insertMany(leadDocs);

  const stages = ["Discovery", "Proposal", "Negotiation", "Won", "Proposal", "Lost"];
  const dealNames = ["FinEdge – CRM rollout", "CloudNest – annual plan", "RetailKart – 50 seats", "HealthPlus – pilot", "GrowthLabs – upgrade", "DataWise – integrations"];
  await Item.insertMany(
    dealNames.map((name, i) => ({
      workspace, board: deals._id, group: deals.groups[stages[i] === "Won" || stages[i] === "Lost" ? 1 : 0].id, name, position: i, createdBy: userId, source: "sample",
      values: {
        [col(deals, "Stage").id]: optId(deals, "Stage", stages[i]),
        [col(deals, "Owner").id]: userId,
        [col(deals, "Value").id]: [120000, 85000, 240000, 60000, 45000, 150000][i],
        [col(deals, "Close date").id]: new Date(Date.now() + (i + 1) * 7 * 86400000).toISOString().slice(0, 10),
        [col(deals, "Contact").id]: people[[0, 2, 3, 4, 5, 7][i]][0],
        [col(deals, "Phone").id]: people[[0, 2, 3, 4, 5, 7][i]][2],
        [col(deals, "Probability").id]: [2, 3, 4, 5, 3, 1][i],
      },
    }))
  );
  await Item.insertMany(
    people.slice(0, 6).map(([name, email, phone, company], i) => ({
      workspace, board: contacts._id, group: contacts.groups[0].id, name, position: i, createdBy: userId, source: "sample",
      values: { [col(contacts, "Type").id]: optId(contacts, "Type", ["Customer", "Prospect", "Customer", "Partner", "Prospect", "Customer"][i]), [col(contacts, "Email").id]: email, [col(contacts, "Phone").id]: phone, [col(contacts, "Company").id]: company, [col(contacts, "Subscribed").id]: i % 2 === 0 },
    }))
  );
  await Activity.insertMany(
    createdLeads.slice(0, 3).map((l, i) => ({ workspace, board: leads._id, item: l._id, type: i === 1 ? "call" : "note", actor: userId, text: i === 1 ? "Discussed pricing, asked for a demo next week." : "Met at SaaS Summit — interested in automations.", data: i === 1 ? { direction: "outbound", outcome: "Connected", durationSec: 312 } : {} }))
  );

  // Install the reference apps
  const softphone = await App.findOne({ slug: "softphone" }).lean();
  const scorer = await App.findOne({ slug: "lead-scorer" }).lean();
  const instSoft = softphone ? (await installApp(String(softphone._id), workspace, userId)).inst : null;
  const instScore = scorer ? (await installApp(String(scorer._id), workspace, userId)).inst : null;

  // Example automations
  const status = col(leads, "Status");
  await Automation.create([
    {
      workspace, board: leads._id, createdBy: userId, name: "Qualified lead → create a deal",
      trigger: { type: "column_changed", config: { column: status.id, to: optId(leads, "Status", "Qualified") } },
      actions: [
        { type: "create_item", config: { board: String(deals._id), group: deals.groups[0].id, name: "{{item.name}} – new deal", values: { [col(deals, "Contact").id]: "{{item.name}}", [col(deals, "Phone").id]: "{{item.Phone}}", [col(deals, "Stage").id]: "Discovery" } } },
        { type: "notify", config: { target: "all", text: "🎯 {{item.name}} became a deal" } },
      ],
    },
    {
      workspace, board: leads._id, createdBy: userId, name: "Website form (catch hook) → new lead",
      trigger: { type: "catch_hook", config: {} }, hookToken: token("hook", 18),
      actions: [
        { type: "create_item", config: { board: String(leads._id), group: leads.groups[0].id, name: "{{payload.name}}", values: { [col(leads, "Email").id]: "{{payload.email}}", [col(leads, "Phone").id]: "{{payload.phone}}", [col(leads, "Company").id]: "{{payload.company}}", [col(leads, "Source").id]: "Website", [status.id]: "New" } } },
        { type: "add_note", config: { text: "Submitted the website form: {{payload.message}}" } },
      ],
    },
    ...(instScore
      ? [{
          workspace, board: leads._id, createdBy: userId, name: "New lead → score it with Lead Scorer",
          trigger: { type: "item_created", config: {} },
          actions: [{ type: "app_action", config: { installation: String(instScore._id), action: "score_lead", inputs: { email: "{{item.Email}}", company: "{{item.Company}}", source: "{{item.Source}}" }, outputMap: { score: col(leads, "Lead score").id } } }],
        }]
      : []),
    ...(instSoft && softphone
      ? [{
          workspace, board: leads._id, createdBy: userId, name: "Call answered (Softphone) → mark Contacted",
          trigger: { type: "app_trigger", config: { app: String(softphone._id), key: "call_ended" } },
          conditions: [{ column: status.id, op: "equals", value: optId(leads, "Status", "New") }],
          actions: [{ type: "set_column", config: { column: status.id, value: "Contacted" } }, { type: "set_column", config: { column: col(leads, "Next follow-up").id, value: "{{today}}" } }],
        }]
      : []),
  ]);

  // Inbox: a website live-chat channel with an auto-reply and one sample conversation
  const chat = await Channel.create({ workspace, type: "webchat", name: "Website chat", token: token("ch", 12), signingSecret: token("chsec", 18), settings: { leadBoard: String(leads._id), autoCreateLead: true } });
  await Automation.create({
    workspace, board: leads._id, createdBy: userId, name: "New website chat → instant auto-reply",
    trigger: { type: "message_received", config: { channel: String(chat._id), onlyNew: true } },
    actions: [{ type: "reply_message", config: { text: "Hi {{payload.contact.name}}! 👋 Thanks for reaching out — a teammate will reply in a few minutes." } }, { type: "add_note", config: { text: "Started a website chat: “{{payload.text}}”" } }],
  });
  const kavya = createdLeads[6];
  const conv = await Conversation.create({ workspace, channel: chat._id, contact: { name: "Kavya Nair", email: "kavya.nair@yahoo.com", key: "kavya.nair@yahoo.com" }, item: kavya._id, board: leads._id, status: "open", lastMessage: "Do you offer a startup discount?", lastMessageAt: new Date(), unread: 1 });
  await Message.insertMany([
    { workspace, conversation: conv._id, direction: "in", authorLabel: "Kavya Nair", text: "Hi! I saw your pricing page. Is there a WhatsApp integration?", createdAt: new Date(Date.now() - 600000) },
    { workspace, conversation: conv._id, direction: "out", author: userId, authorLabel: "", text: "Yes — WhatsApp works through Twilio or any provider, messages land right here in the Inbox.", delivery: "sent", createdAt: new Date(Date.now() - 300000) },
    { workspace, conversation: conv._id, direction: "in", authorLabel: "Kavya Nair", text: "Do you offer a startup discount?", createdAt: new Date() },
  ]);
}
