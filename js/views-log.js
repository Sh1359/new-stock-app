/* Shazim - Scan log + exceptions */
const VLog = {
  q:'', st:'ALL', mode:'ALL', shown:60,
  render(root){
    root.innerHTML =
    '<div class="chips">'+
      ['ALL','MATCHED','MANUAL','DUPLICATE','NOT FOUND','INVALID'].map(f=>'<button class="chip'+(this.st===f?' on':'')+'" onclick="VLog.st=\''+f+'\';VLog.shown=60;VLog.render(document.getElementById(\'view\'))">'+(f==='ALL'?t('all'):f==='NOT FOUND'?t('notFound'):f.charAt(0)+f.slice(1).toLowerCase())+'</button>').join('')+
    '</div>'+
    '<div class="searchbar"><input placeholder="'+t('searchScan')+'" value="'+esc(this.q)+'" oninput="VLog.q=this.value;VLog.shown=60;VLog.list()"></div>'+
    '<div class="btn-row"><button class="btn btn-soft btn-sm" onclick="App.exportLogCSV()">⬇️ CSV</button><button class="btn btn-soft btn-sm" onclick="pinGate(()=>VLog.wipe())">🗑️ '+t('clearLog')+'</button></div>'+
    '<div id="lg-meta" style="font-size:12.5px;color:var(--sub);margin:8px 0"></div>'+
    '<div id="lg-list"></div><div style="text-align:center;margin:10px"><button class="btn btn-soft btn-sm" id="lg-more" onclick="VLog.shown+=120;VLog.list()">'+t('loadMore')+'</button></div>';
    this.list();
  },
  rows(){
    const s=activeSession(); if(!s) return [];
    let rows=sessionScans(s.id).slice().reverse();
    if(this.st!=='ALL') rows=rows.filter(r=>r.status===this.st);
    if(this.q){ const q=this.q.toLowerCase(); rows=rows.filter(r=>(r.barcode||'').toLowerCase().includes(q)||(r.art||'').includes(q)||(r.operator||'').toLowerCase().includes(q)); }
    return rows;
  },
  list(){
    const rows=this.rows(), el=document.getElementById('lg-list');
    document.getElementById('lg-meta').textContent=t('showing')+' '+Math.min(this.shown,rows.length)+' '+t('of')+' '+fmtNum(rows.length);
    document.getElementById('lg-more').style.display=rows.length>this.shown?'':'none';
    el.innerHTML=rows.slice(0,this.shown).map(r=>
      '<div class="list-item"><div class="r1"><span class="n">#'+r.n+'</span>'+statusBadge(r.status)+
      '<span style="flex:1"></span><small style="color:var(--sub)">'+fmtTime(r.time)+'</small></div>'+
      '<div style="font-weight:700;margin-top:3px">📦 '+esc(r.barcode&&r.status!=='MANUAL'?(r.art?r.art+' • ':'')+r.barcode:(r.art?r.art+' ✍️ ×'+r.qty:r.barcode))+'</div>'+
      '<div class="meta">👤 '+esc(r.operator)+' • '+esc(r.mode==='cam'?'📷':r.mode==='device'?'⌨️':'✍️')+(r.qty>1?' • ×'+r.qty:'')+(r.notes?' • 📝 '+esc(r.notes):'')+'</div>'+
      (r.photo?'<img class="photo-thumb" src="'+r.photo+'">':'')+
      (r.status==='NOT FOUND'?'<div class="btn-row" style="margin-top:6px"><button class="btn btn-primary btn-sm" onclick="App.addArticlePrefill(\''+esc(r.attKey||'')+'\')">＋ '+t('addToMaster')+'</button></div>':'')+'</div>'
    ).join('') || '<div class="empty"><div class="big">🧾</div><p>'+t('noScans')+'</p></div>';
  },
  wipe(){
    const s=activeSession();
    confirmBox(t('clearLog')+' — '+s.name+'?', ()=>{
      DB.scans=DB.scans.filter(x=>x.sessionId!==s.id);
      saveDB(); audit('log.clear', s.name); toast(t('saved')); App.refresh();
    }, t('clearLog'));
  }
};

const VExc = {
  render(root){
    const s=activeSession(); if(!s){ root.innerHTML=''; return; }
    const A=aggregate(s.id);
    const nf={}, inv=0;
    sessionScans(s.id).forEach(r=>{ if(r.status==='NOT FOUND') nf[r.attKey||'?']=(nf[r.attKey||'?']||0)+r.qty; });
    const nfRows=Object.keys(nf).sort((a,b)=>nf[b]-nf[a]);
    const pend=A.shorts.concat(A.excess).filter(r=>!DB.resolutions[r.a.key]);
    root.innerHTML =
    '<div class="kpis">'+
      '<div class="kpi red"><div class="lb">📉 '+t('short')+'</div><div class="vl">'+A.shorts.length+'</div><div class="sm">'+fmtTk(A.grossSV)+'</div></div>'+
      '<div class="kpi green"><div class="lb">📈 '+t('excess')+'</div><div class="vl">'+A.excess.length+'</div><div class="sm">'+fmtTk(A.excV)+'</div></div>'+
      '<div class="kpi amber"><div class="lb">❓ '+t('notFound')+'</div><div class="vl">'+nfRows.length+'</div><div class="sm">'+t('total')+' '+fmtNum(nfRows.reduce((x,k)=>x+nf[k],0))+'</div></div>'+
      '<div class="kpi orange"><div class="lb">🛠️ '+t('pending')+'</div><div class="vl">'+pend.length+'</div></div>'+
    '</div>'+
    '<div class="card"><h3>❓ '+t('notFoundCodes')+'</h3>'+
      (nfRows.length?nfRows.slice(0,40).map(k=>'<div class="list-item"><div class="r1"><span class="art">'+esc(fmtKey(k))+'</span><span style="flex:1"></span><b>×'+nf[k]+'</b></div><div class="btn-row" style="margin-top:6px"><button class="btn btn-primary btn-sm" onclick="App.addArticlePrefill(\''+esc(k)+'\')">＋ '+t('addToMaster')+'</button><button class="btn btn-soft btn-sm" onclick="pinGate(()=>App.ignoreNF(\''+esc(k)+'\'))">'+t('ignore')+'</button></div></div>').join(''):'<div class="empty"><p>✅ '+t('noIssues')+'</p></div>')+'</div>'+
    '<div class="card"><h3>📉 '+t('topShort')+' <a href="#" style="float:right;font-size:12px" onclick="VStock.f=\'SHORT\';App.go(\'stock\');return false">'+t('viewAll')+'</a></h3>'+
      (A.shorts.slice(0,15).map(r=>'<div class="list-item" onclick="App.openArticle(\''+r.a.key+'\')"><div class="r1"><span class="art">'+esc(r.a.art)+'</span>'+statusBadge('SHORT')+'<span style="flex:1"></span><b class="neg">'+r.d+'</b></div><div class="meta">Sys '+r.a.system+' → Phy '+r.p+' • '+fmtTk(r.v)+(DB.resolutions[r.a.key]?' • 🛠️ '+esc(DB.resolutions[r.a.key].action):'')+'</div></div>').join('')||'<div class="empty"><p>✅ '+t('noIssues')+'</p></div>')+'</div>'+
    '<div class="card"><h3>📈 '+t('topExcess')+' <a href="#" style="float:right;font-size:12px" onclick="VStock.f=\'EXCESS\';App.go(\'stock\');return false">'+t('viewAll')+'</a></h3>'+
      (A.excess.slice(0,15).map(r=>'<div class="list-item" onclick="App.openArticle(\''+r.a.key+'\')"><div class="r1"><span class="art">'+esc(r.a.art)+'</span>'+statusBadge('EXCESS')+'<span style="flex:1"></span><b class="pos">+'+r.d+'</b></div><div class="meta">Sys '+r.a.system+' → Phy '+r.p+' • '+fmtTk(r.v)+(DB.resolutions[r.a.key]?' • 🛠️ '+esc(DB.resolutions[r.a.key].action):'')+'</div></div>').join('')||'<div class="empty"><p>✅ '+t('noIssues')+'</p></div>')+'</div>';
  }
};
