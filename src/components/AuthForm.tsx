"use client";
import { signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/client";
import { Logo } from "@/components/ui";
import Orbi from "@/components/art/Orbi";
import { Sparkles } from "@/components/art/Scenes";

export default function AuthForm({ mode, google, stale = false }: { mode: "login" | "register"; google: boolean; stale?: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/app";
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState(sp.get("error") ? "Sign-in failed, try again." : "");
  const [busy, setBusy] = useState(false);
  // Session cookie points at an account that no longer exists → clear it silently.
  useEffect(() => { if (stale) signOut({ redirect: false }); }, [stale]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    if (mode === "register") {
      const r = await api("/api/register", { method: "POST", json: f });
      if (!r.ok) {
        setBusy(false);
        return setError(r.error);
      }
    }
    const res = await signIn("credentials", { email: f.email, password: f.password, redirect: false });
    setBusy(false);
    if (!res || res.error) return setError("Wrong email or password.");
    router.push(next);
    router.refresh();
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="hero-gradient relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex">
        <Sparkles className="pointer-events-none absolute inset-0 size-full" />
        <Link href="/" className="relative w-fit rounded-xl bg-white/90 px-3 py-1.5 text-[#2b2d42]"><Logo /></Link>
        <div className="relative mx-auto text-center">
          <div className="mx-auto w-fit animate-float"><Orbi pose={mode === "login" ? "wave" : "celebrate"} size={230} /></div>
          <h2 className="mt-4 text-3xl font-extrabold">{mode === "login" ? "Welcome back, captain!" : "Let's launch your CRM"}</h2>
          <p className="mx-auto mt-2 max-w-sm text-white/85">{mode === "login" ? "Your pipeline, inbox and automations missed you." : "Boards, inbox, automations and apps — set up in a minute with sample data."}</p>
        </div>
        <div className="relative rounded-2xl bg-white/15 p-4 text-sm backdrop-blur">“We replaced three tools with OrbitCRM — the website chat alone brought in 40 leads in a week.”<p className="mt-2 text-xs text-white/75">— A very happy (fictional) sales team</p></div>
      </div>
      <div className="flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm p-7">
        <Link href="/" className="lg:hidden">
          <Logo />
        </Link>
        <h1 className="mt-6 text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-muted">{mode === "login" ? "Log in to your workspace" : "Free forever for small teams"}</p>
        {google && (
          <>
            <button onClick={() => signIn("google", { callbackUrl: next })} className="btn btn-secondary mt-6 w-full">
              <svg viewBox="0 0 24 24" className="size-4">
                <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
              </svg>
              Continue with Google
            </button>
            <div className="my-4 flex items-center gap-3 text-xs text-faint">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}
        <form onSubmit={submit} className={google ? "space-y-3" : "mt-6 space-y-3"}>
          {mode === "register" && (
            <div>
              <label className="label">Name</label>
              <input className="input" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </div>
          )}
          <div>
            <label className="label">Work email</label>
            <input className="input" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" required minLength={6} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </div>
          {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          {mode === "login" ? "New to OrbitCRM? " : "Already have an account? "}
          <Link href={`/${mode === "login" ? "register" : "login"}?next=${encodeURIComponent(next)}`} className="font-semibold text-brand">
            {mode === "login" ? "Create an account" : "Log in"}
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
