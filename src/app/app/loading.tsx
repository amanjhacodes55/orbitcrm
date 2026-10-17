import Orbi from "@/components/art/Orbi";

/** Shown instantly while an /app page loads on the server (no more blank screen). */
export default function Loading() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 text-muted">
      <div className="animate-float"><Orbi pose="rocket" size={110} /></div>
      <p className="text-sm">Loading…</p>
    </div>
  );
}
