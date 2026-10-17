/** Shared HTML shell for the bundled reference apps (they behave exactly like third-party apps: plain HTML + the SDK). */
export function demoPage(title: string, body: string, script: string) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
*{box-sizing:border-box}body{margin:0;font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#323338;background:#fff}
.wrap{padding:16px}h1{font-size:15px;margin:0 0 10px}label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;color:#676879;margin:10px 0 4px}
input,select,textarea{width:100%;padding:8px 10px;border:1px solid #e3e5ec;border-radius:8px;font:inherit}textarea{min-height:64px}
button{border:0;border-radius:8px;padding:9px 12px;font:600 14px system-ui;cursor:pointer}.primary{background:#6161ff;color:#fff}.green{background:#00c875;color:#fff}.red{background:#e2445c;color:#fff}.ghost{background:#f5f6f8}
.row{display:flex;gap:8px}.row>*{flex:1}.muted{color:#676879;font-size:12px}.big{font-size:28px;font-weight:700;letter-spacing:1px;text-align:center;margin:8px 0}
.pad{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0}.pad button{background:#f5f6f8;font-size:16px;padding:10px}
.pill{display:inline-block;padding:2px 8px;border-radius:99px;background:#eeeeff;color:#6161ff;font-size:12px;font-weight:600}
</style></head><body><div class="wrap">${body}</div><script src="/sdk/orbit-app-sdk.js"></script><script>${script}</script></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}
