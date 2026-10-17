"use client";
import { useEffect } from "react";
import Link from "next/link";
import Orbi from "@/components/art/Orbi";

export default function ErrorView({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <Orbi pose="think" size={150} />
      <h1 className="mt-2 text-2xl font-bold">Something went sideways</h1>
      <p className="mt-1 max-w-md text-sm text-muted">Orbi hit a bump loading this page. It&apos;s usually temporary — try again in a moment.{error.digest ? ` (ref ${error.digest})` : ""}</p>
      <div className="mt-5 flex gap-2">
        <button className="btn btn-primary" onClick={() => reset()}>Try again</button>
        <Link className="btn btn-secondary" href="/app">Go home</Link>
      </div>
    </div>
  );
}
