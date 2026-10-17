"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type T = { id: number; kind: "success" | "error" | "info"; text: string };
const Ctx = createContext<(text: string, kind?: T["kind"]) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<T[]>([]);
  const push = useCallback((text: string, kind: T["kind"] = "info") => {
    const id = Date.now() + Math.random();
    setList((l) => [...l, { id, kind, text }]);
    setTimeout(() => setList((l) => l.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 left-1/2 z-[200] flex w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 flex-col gap-2">
        {list.map((t) => (
          <div key={t.id} className="animate-pop pointer-events-auto flex items-start gap-2.5 rounded-lg bg-[#323338] px-4 py-3 text-sm text-white shadow-pop">
            {t.kind === "success" ? <CheckCircle2 className="mt-0.5 size-4 text-success" /> : t.kind === "error" ? <AlertTriangle className="mt-0.5 size-4 text-danger" /> : <Info className="mt-0.5 size-4 text-[#7b7bff]" />}
            <span className="flex-1">{t.text}</span>
            <button onClick={() => setList((l) => l.filter((x) => x.id !== t.id))}>
              <X className="size-4 opacity-60" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
