/**
 * Embeddable live-chat loader:
 *   <script src="https://<orbit-host>/widget.js" data-channel="ch_xxx" async></script>
 */
export function GET(req: Request) {
  const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
  const js = `(function(){
  var s=document.currentScript||document.querySelector('script[data-channel]'); if(!s) return;
  var ch=s.getAttribute('data-channel'), color=s.getAttribute('data-color')||'#6161ff', origin=${JSON.stringify(origin)};
  if(document.getElementById('orbit-chat-btn')) return;
  var btn=document.createElement('button'); btn.id='orbit-chat-btn'; btn.setAttribute('aria-label','Chat with us');
  btn.innerHTML='<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  btn.style.cssText='position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;border:0;background:'+color+';box-shadow:0 8px 24px rgba(0,0,0,.25);cursor:pointer;z-index:2147483646;display:flex;align-items:center;justify-content:center';
  var fr=document.createElement('iframe'); fr.src=origin+'/chat/'+encodeURIComponent(ch); fr.title='Chat';
  fr.style.cssText='position:fixed;right:20px;bottom:88px;width:370px;height:540px;max-width:calc(100vw - 40px);max-height:calc(100vh - 110px);border:0;border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.25);z-index:2147483647;display:none;background:#fff';
  btn.onclick=function(){ fr.style.display = fr.style.display==='none' ? 'block' : 'none'; };
  document.body.appendChild(fr); document.body.appendChild(btn);
})();`;
  return new Response(js, { headers: { "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "public, max-age=300", "Access-Control-Allow-Origin": "*" } });
}
