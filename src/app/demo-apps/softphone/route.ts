import { demoPage } from "@/lib/demoPage";

/** Reference DIALER app. Real apps would connect Twilio/Exotel/SIP.js here; this one simulates the call. */
export function GET() {
  return demoPage(
    "Softphone",
    `<h1>📞 Softphone <span class="pill" id="status">Ready</span></h1>
<input id="num" placeholder="Phone number">
<div class="muted" id="who">Click a phone number in the CRM, or type one.</div>
<div class="big" id="timer">00:00</div>
<div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, "+", 0, "⌫"].map((k) => `<button data-k="${k}">${k}</button>`).join("")}</div>
<div class="row"><button class="green" id="call">Call</button><button class="red" id="hang" style="display:none">Hang up</button></div>
<div id="after" style="display:none">
  <label>Outcome</label><select id="outcome"><option>Connected</option><option>No answer</option><option>Left voicemail</option><option>Busy</option><option>Wrong number</option></select>
  <label>Notes</label><textarea id="notes" placeholder="What happened on the call?"></textarea>
  <button class="primary" id="log" style="width:100%;margin-top:8px">Log call to CRM</button>
</div>`,
    `let item=null,start=0,t=null,settings={};
const $=id=>document.getElementById(id);
Orbit.init().then(async c=>{ if(c.phone){$('num').value=c.phone} if(c.item){item=c.item;$('who').textContent='Calling for: '+c.item.name} settings=await Orbit.settings.get().catch(()=>({})); if(settings.callerId) $('status').textContent='Caller ID '+settings.callerId; });
Orbit.on('dial',d=>{ $('num').value=d.phone||''; item=d.item; $('who').textContent=d.item?('Calling for: '+d.item.name):'Ad-hoc call'; reset(); if(settings.autoDial) call(); });
document.querySelectorAll('.pad button').forEach(b=>b.onclick=()=>{const k=b.dataset.k;$('num').value=k==='⌫'?$('num').value.slice(0,-1):$('num').value+k});
function fmt(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
function reset(){clearInterval(t);$('timer').textContent='00:00';$('after').style.display='none';$('call').style.display='';$('hang').style.display='none';$('status').textContent='Ready'}
function call(){ if(!$('num').value) return Orbit.ui.toast('Enter a number'); start=Date.now(); $('status').textContent='On call…'; $('call').style.display='none'; $('hang').style.display=''; $('after').style.display='none'; t=setInterval(()=>$('timer').textContent=fmt(Math.floor((Date.now()-start)/1000)),500); }
$('call').onclick=call;
$('hang').onclick=()=>{clearInterval(t);$('hang').style.display='none';$('status').textContent='Call ended';$('after').style.display='block'};
$('log').onclick=async()=>{
  if(!item){ Orbit.ui.toast('Open the dialer from a lead/deal to log the call'); return; }
  const dur=Math.max(1,Math.floor((Date.now()-start)/1000)), outcome=$('outcome').value;
  try{
    await Orbit.activities.log({itemId:item.id,type:'call',direction:'outbound',outcome,durationSec:dur,phone:$('num').value,text:$('notes').value});
    const r=await Orbit.triggers.fire('call_ended',{outcome,duration:dur,phone:$('num').value},item.id);
    Orbit.ui.toast('Call logged'+(r&&r.triggered?' · '+r.triggered+' automation(s) ran':''));
    $('notes').value=''; reset();
  }catch(e){ Orbit.ui.toast('Could not log: '+e.message) }
};`
  );
}
