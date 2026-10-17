import Link from "next/link";
import { getCtx } from "@/lib/context";
import { Logo } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DevLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCtx();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-5 px-4">
          <Link href="/developer"><Logo /></Link>
          <span className="rounded bg-[#323338] px-2 py-0.5 text-xs font-bold text-white">DEVELOPERS</span>
          <nav className="flex gap-1 text-sm">
            {ctx && <Link href="/developer" className="rounded px-3 py-1.5 hover:bg-surface-2">My apps</Link>}
            <Link href="/developer/docs" className="rounded px-3 py-1.5 hover:bg-surface-2">Docs & API</Link>
          </nav>
          <div className="ml-auto">
            {ctx ? <Link href="/app" className="btn btn-secondary btn-sm">Back to CRM</Link> : <Link href="/login?next=/developer" className="btn btn-primary btn-sm">Log in</Link>}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
