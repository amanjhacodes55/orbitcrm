import { demoPage } from "@/lib/demoPage";

export function GET() {
  return demoPage(
    "Lead Scorer settings",
    `<h1>📈 Lead Scorer settings</h1>
<p class="muted">These weights are sent to the scoring endpoint with every “Score lead” automation action.</p>
<label>Preferred sources (comma separated, +20 points)</label><input id="src" placeholder="Referral, Website">
<label>Penalty for free email domains (gmail, yahoo…)</label><input id="pen" type="number" min="0" max="60" value="25">
<button class="primary" id="save" style="margin-top:12px">Save</button>`,
    `const $=id=>document.getElementById(id);
Orbit.init().then(async()=>{ const s=await Orbit.settings.get(); $('src').value=s.preferredSources||'Referral, Website'; $('pen').value=s.freeMailPenalty??25; });
$('save').onclick=async()=>{ try{ await Orbit.settings.save({preferredSources:$('src').value,freeMailPenalty:Number($('pen').value)}); Orbit.ui.toast('Lead Scorer settings saved'); }catch(e){ Orbit.ui.toast(e.message) } };`
  );
}
