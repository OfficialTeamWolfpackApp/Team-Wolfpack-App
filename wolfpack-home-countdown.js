/* Live homepage countdown: reads the same record selected by renderNextFight.
   A date-only fight has no confirmed bell time, so count to the UK calendar date. */
(function(){
  "use strict";
  const box=document.getElementById("wolfpackCountdown");
  if(!box)return;
  const byId=id=>document.getElementById(id);
  const fields=["Days","Hours","Minutes","Seconds"].map(x=>byId("wolfpackCountdown"+x));
  let target=null, timer=null;
  function parseDate(f){
    if(!f||f.dateTba===true)return null;
    const raw=String(f.date||f.fightDate||"").trim();
    const match=raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(!match)return null;
    const y=Number(match[1]),m=Number(match[2]),d=Number(match[3]);
    const check=new Date(Date.UTC(y,m-1,d));
    if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d)return null;
    // Date-only records: UK midnight, accounting for British Summer Time.
    const utcMidnight=Date.UTC(y,m-1,d);
    const ukHour=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",hour:"2-digit",hourCycle:"h23"}).format(new Date(utcMidnight));
    return utcMidnight+(ukHour==="01"?-3600000:0);
  }
  function tick(){
    if(target===null)return;
    const remaining=Math.max(0,target-Date.now());
    const seconds=Math.floor(remaining/1000);
    const values=[Math.floor(seconds/86400),Math.floor(seconds%86400/3600),Math.floor(seconds%3600/60),seconds%60];
    values.forEach((v,i)=>{fields[i].textContent=String(v).padStart(2,"0")});
    if(remaining===0){
      byId("wolfpackCountdownNote").textContent="Fight date reached — check the fight details for the latest updates.";
      clearInterval(timer);timer=null;
    }
  }
  window.wolfpackSetCountdownFight=function(f){
    clearInterval(timer);timer=null;target=parseDate(f);
    if(target===null||target<=Date.now()){box.hidden=true;return;}
    const opponent=String(f.opponent||f.opponentName||"TBA").trim()||"TBA";
    const fighter=String(f.fighter||f.fighterName||"MRS WOLFIE").trim()||"MRS WOLFIE";
    byId("wolfpackCountdownFight").textContent=fighter.toUpperCase()+" VS "+opponent.toUpperCase();
    byId("wolfpackCountdownNote").textContent="Counting down to the fight date (UK midnight). Exact fight time has not been confirmed.";
    box.hidden=false;tick();timer=setInterval(tick,1000);
  };
})();
