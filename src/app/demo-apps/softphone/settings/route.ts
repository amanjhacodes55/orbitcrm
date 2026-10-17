import { demoPage } from "@/lib/demoPage";

export function GET() {
  return demoPage(
    "Softphone settings",
    `<h1>📞 Softphone settings</h1>
<p class="muted">Stored per workspace with Orbit.settings.save().</p>
<label>Caller ID shown to customers</label><input id="callerId" placeholder="+91 80 4000 0000">
<label><input type="checkbox" id="autoDial" style="width:auto"> Dial immediately when a number is clicked</label>
<button class="primary" id="save" style="margin-top:12px">Save settings</button>`,
    `const $=id=>document.getElementById(id);
Orbit.init().then(async c=>{ const s=await Orbit.settings.get(); $('callerId').value=s.callerId||''; $('autoDial').checked=!!s.autoDial; if(!c.canAdmin){$('save').disabled=true;$('save').textContent='Only admins can change settings'} });
$('save').onclick=async()=>{ try{ await Orbit.settings.save({callerId:$('callerId').value,autoDial:$('autoDial').checked}); Orbit.ui.toast('Softphone settings saved'); }catch(e){ Orbit.ui.toast(e.message) } };`
  );
}
