import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });

export const metadata: Metadata = {
  title: { default: "OrbitCRM — boards, automations & apps", template: "%s · OrbitCRM" },
  description: "A monday-style CRM with kanban & grid boards, workflow automations, webhooks, a developer platform and an app marketplace.",
  icons: { icon: "/logo.svg" },
};

const themeScript = `try{document.documentElement.dataset.theme=localStorage.getItem('orbit-theme')||'light'}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={figtree.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
