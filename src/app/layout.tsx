import type { Metadata } from "next";
import { Figtree, Bricolage_Grotesque, Space_Grotesk, Fredoka } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { THEMES } from "@/lib/themes";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk", display: "swap" });
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", display: "swap" });

export const metadata: Metadata = {
  title: { default: "OrbitCRM — boards, automations & apps", template: "%s · OrbitCRM" },
  description: "A monday-style CRM with kanban & grid boards, workflow automations, an omnichannel inbox, a developer platform and an app marketplace.",
  icons: { icon: "/logo.svg" },
};

const modes = Object.fromEntries(THEMES.map((t) => [t.id, t.mode]));
// Runs before paint: no flash of the wrong theme.
const themeScript = `try{var m=${JSON.stringify(modes)};var t=localStorage.getItem('orbit-theme');if(!m[t])t='light';document.documentElement.dataset.theme=t;document.documentElement.dataset.mode=m[t]}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-mode="light" suppressHydrationWarning className={`${figtree.variable} ${bricolage.variable} ${grotesk.variable} ${fredoka.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
