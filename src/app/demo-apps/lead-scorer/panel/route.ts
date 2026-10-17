import { demoPage } from "@/lib/demoPage";

/** Reference ITEM PANEL: shows the score breakdown for the open item and lets the user re-score it. */
export function GET() {
  return demoPage(
    "Lead Scorer panel",
    `<div id="out" class="muted">Loading…</div><button class="primary" id="rescore" style="margin-top:10px">Re-score now</button>`,
    `const $=id=>document.getElementById(id); let ctx;
function score(f){ const email=(f.Email||'')+'', dom=email.split('@')[1]||''; let s=40, why=[];
 if(!dom){s-=20;why.push('no email')} else if(/gmail|yahoo|hotmail|outlook|icloud/.test(dom)){s-=25;why.push('free email')} else {s+=25;why.push('business email')}
 if(f.Company&&f.Company!=='—'){s+=15;why.push('has company')} if(['Referral','Website'].includes(f.Source)){s+=20;why.push(f.Source+' source')}
 s=Math.max(0,Math.min(100,s)); return {s,why}; }
async function load(){ const it=await Orbit.items.get(ctx.item.id); const r=score(it.fields||{});
 $('out').innerHTML='<div class="big">'+r.s+'</div><div class="muted" style="text-align:center">'+r.why.join(' · ')+'</div><div class="muted" style="margin-top:6px">Current “Lead score” column: <b>'+(it.fields['Lead score']??'—')+'</b></div>'; return r; }
Orbit.init().then(c=>{ctx=c; if(!c.item){$('out').textContent='Open an item to see its score.';return} load().catch(e=>$('out').textContent=e.message)});
$('rescore').onclick=async()=>{ const r=await load(); try{ await Orbit.items.update(ctx.item.id,{'Lead score':r.s}); Orbit.ui.toast('Lead score updated to '+r.s);}catch(e){Orbit.ui.toast(e.message)} };`
  );
}
