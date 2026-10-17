/** fetch() wrapper for client components: never throws; returns { ok, data, error }. */
export async function api<T = Record<string, unknown>>(url: string, init?: RequestInit & { body?: BodyInit | null; json?: unknown }) {
  try {
    const { json: body, ...rest } = init || {};
    const r = await fetch(url, {
      ...rest,
      headers: { ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(rest.headers || {}) },
      body: body !== undefined ? JSON.stringify(body) : rest.body,
    });
    const text = await r.text();
    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: r.status >= 500 ? `Server error (${r.status})` : `Unexpected response (${r.status})` };
    }
    const d = data as T & { error?: string };
    return { ok: r.ok, status: r.status, data: d, error: r.ok ? "" : d.error || `Request failed (${r.status})` };
  } catch {
    return { ok: false, status: 0, data: {} as T & { error?: string }, error: "Can't reach the server. Check your connection." };
  }
}
