/* Shazim - App controller + onboarding + back-stack */
const MGR_TABS = ['control','users','backup'];
const App = {
  tab:'home', hist:[],
  go(tab, push){
    if(!sessionRole){ showLock(); return; }
    if(MGR_TABS.indexOf(tab)>=0 && !isMgr()){ toast(t('needManager')); tab='home'; }
    VScan.stop();
    if(push!==false && this.tab!==tab) { this.hist.push(this.tab); if(this.hist.length>30) this.hist.shift(); }
    this.tab=tab;
    try{ DB.ui.tab=tab; saveDBSoon(); }catch(e){}
    applyLang(); applyTheme(); renderChrome(tab);
    const root=document.getElementById('view');
    try{ window.scrollTo(0,0); }catch(e){}
    const V={home:()=>VHome.render(root), scan:()=>VScan.render(root), stock:()=>VStock.render(root),
      log:()=>VLog.render(root), more:()=>VMore.render(root), except:()=>VExc.render(root),
      reports:()=>VRep.render(root), insights:()=>VIns.render(root), sessions:()=>VSess.render(root),
      master:()=>VMas.render(root), users:()=>VUsr.render(root), backup:()=>VBak.render(root),
      settings:()=>VSet.render(root), control:()=>VCtl.render(root)};
    (V[tab]||V.home)();
    try{
      document.querySelectorAll('#app-nav button').forEach(b=>b.classList.remove('on'));
      const map={home:0,scan:1,stock:2,log:3}; const idx=(map[tab]!==undefined)?map[tab]:4;
      const btns=document.querySelectorAll('#app-nav button'); if(btns[idx]) btns[idx].classList.add('on');
    }catch(e){}
  },
  refresh(){ this.go(this.tab, false); },
  back(){
    // 1. close modal/tour first
    try{
      if(document.getElementById('tour').classList.contains('show')){ tourSkip(); return true; }
      if(document.getElementById('modal-wrap').classList.contains('show')){ closeModal(); return true; }
    }catch(e){}
    // 2. walk history
    const prev=this.hist.pop();
    if(prev){ this.go(prev, false); return true; }
    // 3. go home
    if(this.tab!=='home'){ this.go('home'); return true; }
    // 4. confirm exit
    askExit(); return true;
  },
  deviceBack(){ try{ this.back(); }catch(e){} },
  switchSession(id){ if(!id) return; DB.activeSessionId=id; saveDB(); audit('session.switch',(DB.sessions.find(s=>s.id===id)||{}).name||''); toast(t('switched')); this.refresh(); },
  openArticle(key){ VStock.detail(key); },
  addArticlePrefill(key){ VMas.prefill(key); },
  ignoreNF(key){
    DB.scans.forEach(r=>{ if(r.status==='NOT FOUND'&&(r.attKey===key)) r.status='INVALID'; });
    saveDB(); toast(t('ignored')); this.refresh();
  },
  exportLogCSV(){
    if(!isMgr()){ toast(t('needManager')); return; }
    const s=activeSession(); if(!s) return;
    const rows=sessionScans(s.id);
    const esc2=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
    let csv='N,Barcode,Article,Status,Qty,Operator,Time,Notes\n';
    rows.forEach(r=>{ csv+=[r.n,esc2(r.barcode),r.art||'',r.status,r.qty,esc2(r.operator),new Date(r.time).toLocaleString(),esc2(r.notes||'')].join(',')+'\n'; });
    download('scanlog-'+slug(s.name)+'.csv', csv, 'text/csv');
    audit('log.csv', s.name); saveDB(); toast(t('downloaded'));
  },
  exportMasterCSV(){
    if(!isMgr()){ toast(t('needManager')); return; }
    let csv='Article,Category,System,Price,Upsale\n';
    ARTICLES.forEach(a=>{ csv+=[a.art,a.cat,a.system,a.price,'"'+String(a.extra||'').replace(/"/g,'""')+'"'].join(',')+'\n'; });
    download('master-'+ARTICLES.length+'.csv', csv, 'text/csv');
    audit('master.csv',''); saveDB(); toast(t('downloaded'));
  },
  backup(share){
    if(!isMgr()){ toast(t('needManager')); return; }
    flushSave();
    const blob=new Blob([JSON.stringify({app:'shazim',v:1,exportedAt:Date.now(),db:DB,articles:ARTICLES})],{type:'application/json'});
    const name='shazim-backup-'+new Date().toISOString().slice(0,10)+'.json';
    if(share && navigator.share){
      const f=new File([blob],name,{type:'application/json'});
      navigator.share({files:[f],title:'Shazim Backup'}).catch(()=>{});
    } else {
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),4000);
    }
    audit('backup', name); saveDB(); toast(t('downloaded'));
  },
  install(){
    if(window.__installEvt){ window.__installEvt.prompt(); }
    else toast(t('installManual'));
  }
};
window.App=App;

/* ---- onboarding tour ---- */
function showTour(){
  try{ if(localStorage.getItem('shazim_tour')) return; }catch(e){ return; }
  const steps=[
    ['🏠', t('tour1t'), t('tour1')],
    ['📷', t('tour2t'), t('tour2')],
    ['📦', t('tour3t'), t('tour3')],
    ['📄', t('tour4t'), t('tour4')],
  ];
  let i=0;
  const ov=document.getElementById('tour');
  const draw=()=>{
    ov.innerHTML='<div class="tour-card"><div style="font-size:40px">'+steps[i][0]+'</div><h3>'+steps[i][1]+'</h3><p>'+steps[i][2]+'</p>'+
    '<div class="tour-dots">'+steps.map((_,j)=>'<i class="'+(j===i?'on':'')+'"></i>').join('')+'</div>'+
    '<div class="btn-row"><button class="btn btn-soft" onclick="tourSkip()">'+t('skip')+'</button><button class="btn btn-primary" onclick="tourNext()">'+(i===steps.length-1?t('start'):t('next'))+'</button></div></div>';
    ov.classList.add('show');
  };
  window.tourNext=()=>{ i++; if(i>=steps.length){ try{localStorage.setItem('shazim_tour','1');}catch(e){} ov.classList.remove('show'); } else draw(); };
  window.tourSkip=()=>{ try{localStorage.setItem('shazim_tour','1');}catch(e){} ov.classList.remove('show'); };
  draw();
}

/* ---- boot ---- */
window.addEventListener('beforeinstallprompt', e=>{ e.preventDefault(); window.__installEvt=e; });
document.addEventListener('visibilitychange', ()=>{ if(document.hidden){ try{flushSave();}catch(e){} } });
window.addEventListener('pagehide', ()=>{ try{flushSave();}catch(e){} });
window.addEventListener('beforeunload', ()=>{ try{flushSave();}catch(e){} });
async function boot(){
  document.getElementById('splash').style.display='flex';
  applyLang(); applyTheme();
  try{
    await ensureSeeded((p,msg)=>{
      document.getElementById('splash-fill').style.width=Math.round(p*100)+'%';
      document.getElementById('splash-msg').textContent=msg;
    });
  }catch(err){
    const m = document.getElementById('splash-msg');
    m.innerHTML = '⚠️ ডেটা লোড হয়নি<br><small style="opacity:.75">'+esc(String((err&&err.message)||err))+'</small><br><button class="btn btn-primary" style="margin-top:14px" onclick="location.reload()">🔁 আবার চেষ্টা করুন</button>';
    return;
  }
  applyLang(); applyTheme();
  document.getElementById('splash').style.display='none';
  showLock(); // PIN first — unlockOk() restores last tab + tour
  if('serviceWorker' in navigator){
    try{ await navigator.serviceWorker.register('sw.js'); }catch(e){}
  }
}
document.addEventListener('DOMContentLoaded', boot);
