import Link from "next/link";
import Orbi from "@/components/art/Orbi";
import { Sparkles } from "@/components/art/Scenes";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 text-center">
      <Sparkles className="pointer-events-none absolute inset-0 size-full opacity-70" />
      <div className="animate-float"><Orbi pose="rocket" size={200} /></div>
      <p className="font-display text-7xl font-extrabold text-gradient">404</p>
      <h1 className="mt-2 text-2xl font-bold">Orbi flew too far…</h1>
      <p className="mt-1 max-w-sm text-muted">This page drifted out of orbit. Let&apos;s get you back to base.</p>
      <Link href="/app" className="btn btn-primary mt-6 !px-6">Take me home</Link>
    </div>
  );
}
