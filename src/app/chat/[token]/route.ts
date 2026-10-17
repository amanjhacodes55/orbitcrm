import { dbConnect } from "@/lib/db";
import { Channel, Workspace } from "@/lib/models";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** The chat window shown inside the website widget iframe (standalone HTML, talks to /api/public/chat). */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  await dbConnect();
  const ch = await Channel.findOne({ token, type: "webchat" }).lean();
  if (!ch || !ch.active) return new Response("<p style='font-family:sans-serif;padding:20px'>Chat is offline.</p>", { headers: { "Content-Type": "text/html" }, status: 404 });
  const ws = await Workspace.findById(ch.workspace).select("name").lean();
  const color = /^#[0-9a-f]{3,8}$/i.test(ch.settings?.color || "") ? ch.settings!.color! : "#6161ff";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chat</title>
<style>*{box-sizing:border-box}body{margin:0;font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#222;display:flex;flex-direction:column;height:100vh}
header{background:${color};color:#fff;padding:16px}header b{font-size:16px}header p{margin:4px 0 0;opacity:.85;font-size:13px}
#log{flex:1;overflow-y:auto;padding:14px;background:#f6f7fb;display:flex;flex-direction:column;gap:8px}
.m{max-width:80%;padding:8px 12px;border-radius:14px;white-space:pre-wrap;word-wrap:break-word}.v{align-self:flex-end;background:${color};color:#fff;border-bottom-right-radius:4px}.a{align-self:flex-start;background:#fff;border:1px solid #e5e7eb;border-bottom-left-radius:4px}.who{font-size:11px;color:#888;margin:0 4px}
form{display:flex;gap:8px;padding:10px;border-top:1px solid #eee}input,textarea{flex:1;border:1px solid #ddd;border-radius:10px;padding:9px 11px;font:inherit}button{border:0;background:${color};color:#fff;border-radius:10px;padding:0 16px;font-weight:600;cursor:pointer}
#start{padding:16px;display:flex;flex-direction:column;gap:8px;background:#f6f7fb;flex:1}#start button{padding:10px}.err{color:#e2445c;font-size:12px}</style></head>
<body><header><b>${esc(ws?.name || "Chat")}</b><p>${esc(ch.settings?.greeting || "Hi! How can we help?")}</p></header>
<div id="start"><input id="n" placeholder="Your name" maxlength="80"><input id="e" type="email" placeholder="Email (so we can follow up)"><textarea id="t" rows="4" placeholder="Your message"></textarea><button id="go">Start chat</button><div class="err" id="err"></div></div>
<div id="log" style="display:none"></div><form id="f" style="display:none"><input id="msg" placeholder="Type a message…" autocomplete="off"><button>Send</button></form>
<script>
var T=${JSON.stringify(token)}, K='orbit-chat-'+T, S=null, last=null, seen={};
try{S=JSON.parse(localStorage.getItem(K)||'null')}catch(e){}
var $=function(i){return document.getElementById(i)};
function add(m){ if(seen[m.id]) return; seen[m.id]=1; var d=document.createElement('div'); d.className='m '+(m.from==='visitor'?'v':'a'); d.textContent=m.text;
  if(m.from!=='visitor'&&m.author){var w=document.createElement('div');w.className='who';w.textContent=m.author;$('log').appendChild(w)} $('log').appendChild(d); $('log').scrollTop=1e9; last=m.at; }
function show(){ $('start').style.display='none'; $('log').style.display='flex'; $('f').style.display='flex'; poll(); }
async function poll(){ if(!S) return; try{ var r=await fetch('/api/public/chat/'+T+'/messages?c='+S.c+'&v='+encodeURIComponent(S.v)+(last?'&after='+encodeURIComponent(last):''));
  if(r.status===401){ localStorage.removeItem(K); location.reload(); return } var d=await r.json(); (d.messages||[]).forEach(add); }catch(e){} }
$('go').onclick=async function(){ $('err').textContent=''; var r=await fetch('/api/public/chat/'+T+'/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('n').value,email:$('e').value,text:$('t').value})});
  var d=await r.json(); if(!r.ok){ $('err').textContent=d.error||'Could not start chat'; return } S={c:d.conversationId,v:d.visitorToken}; try{localStorage.setItem(K,JSON.stringify(S))}catch(e){} show(); };
$('f').onsubmit=async function(e){ e.preventDefault(); var t=$('msg').value.trim(); if(!t) return; $('msg').value='';
  await fetch('/api/public/chat/'+T+'/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({c:S.c,v:S.v,text:t})}); poll(); };
if(S) show(); setInterval(poll,3000);
</script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}
