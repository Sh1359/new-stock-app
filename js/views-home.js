/* Shazim - Home dashboard view */
const VHome = {
  render(root){
    const s = activeSession();
    if(!s){ root.innerHTML = '<div class="empty"><div class="big">🗂️</div><p>'+t('noScans')+'</p><button class="btn btn-primary" onclick="App.go(\'sessions\')">'+t('newSession')+'</button></div>'; return; }
    const A = aggregate(s.id), C = A.counts;
    const wb = window.__installEvt ? '<div class="install-banner">📲<div style="flex:1"><b>'+t('installApp')+'</b><div style="font-size:12px;opacity:.85">'+t('installMsg')+'</div></div><button class="btn btn-primary btn-sm" onclick="App.install()">'+t('install')+'</button></div>' : '';
    root.innerHTML = wb +
    (s.imported?'<div class="note">🗃️ '+t('archiveNote')+' <a href="#" onclick="App.go(\'sessions\');return false"><b>'+t('startFresh')+'</b></a></div><div style="height:10px"></div>':'')+
    '<div class="kpis">'+
      '<div class="kpi orange"><div class="bar-top"></div><div class="lb">🧾 '+t('totalScan')+'</div><div class="vl">'+fmtNum(C.total)+'</div><div class="sm">'+esc(s.name).slice(0,26)+'</div></div>'+
      '<div class="kpi red"><div class="lb">📉 '+t('shortage')+'</div><div class="vl">-'+fmtNum(A.grossS)+'</div><div class="sm">'+fmtTk(-A.grossSV)+'</div></div>'+
      '<div class="kpi green"><div class="lb">📈 '+t('excess')+'</div><div class="vl">+'+fmtNum(A.excQ)+'</div><div class="sm">'+fmtTk(A.excV)+'</div></div>'+
      '<div class="kpi amber"><div class="lb">❓ '+t('notFound')+'</div><div class="vl">'+fmtNum(C['NOT FOUND'])+'</div><div class="sm">'+t('duplicate')+': '+fmtNum(C.DUPLICATE)+'</div></div>'+
    '</div>'+
    '<div class="kpis">'+
      '<div class="kpi"><div class="lb">✅ '+t('matched')+'</div><div class="vl" style="font-size:19px">'+fmtNum(C.MATCHED)+'</div></div>'+
      '<div class="kpi"><div class="lb">✍️ '+t('manual')+'</div><div class="vl" style="font-size:19px">'+fmtNum(C.MANUAL)+'</div></div>'+
      '<div class="kpi"><div class="lb">⛔ '+t('duplicate')+'</div><div class="vl" style="font-size:19px">'+fmtNum(C.DUPLICATE)+'</div></div>'+
      '<div class="kpi"><div class="lb">⚠️ '+t('invalid')+'</div><div class="vl" style="font-size:19px">'+fmtNum(C.INVALID)+'</div></div>'+
    '</div>'+
    '<div class="card"><h3>⚖️ '+t('recon')+'</h3>'+
      '<div class="recon-row"><span class="k">📦 '+t('sysStock')+'</span><span class="v">'+fmtNum(A.sysQ)+' <small style="color:var(--sub)">'+fmtTk(A.sysV)+'</small></span></div>'+
      '<div class="recon-row"><span class="k">📋 '+t('phyStock')+'</span><span class="v">'+fmtNum(A.phyQ)+' <small style="color:var(--sub)">'+fmtTk(A.phyV)+'</small></span></div>'+
      '<div class="recon-row"><span class="k">➖ '+t('netDiff')+'</span><span class="v '+(A.netQ<0?'neg':'pos')+'">'+fmtNum(A.netQ)+' <small>'+fmtTk(A.netV)+'</small></span></div>'+
      '<div class="recon-row"><span class="k">📉 '+t('grossShort')+'</span><span class="v neg">'+fmtNum(A.grossS)+' <small>'+fmtTk(A.grossSV)+'</small></span></div>'+
      '<div class="recon-row"><span class="k">📈 '+t('excessQ')+'</span><span class="v pos">+'+fmtNum(A.excQ)+' <small>'+fmtTk(A.excV)+'</small></span></div>'+
    '</div>'+
    '<div class="card"><h3>🔍 '+t('quickLookup')+'</h3>'+
      '<div class="searchbar"><input id="ql-in" placeholder="'+t('quickLookupPh')+'" onkeydown="if(event.key===\'Enter\')VHome.lookup()"><button class="btn btn-primary btn-sm" style="padding:12px 16px" onclick="VHome.lookup()">'+t('lookup')+'</button></div>'+
      '<div id="ql-out"></div></div>'+
    '<div class="card"><h3>⚡ '+t('quickActions')+'</h3><div class="grid2">'+
      '<div class="act" onclick="App.go(\'scan\')"><div class="ic">📷</div><div class="tx">'+t('newScan')+'</div></div>'+
      '<div class="act" onclick="App.go(\'stock\')"><div class="ic">📦</div><div class="tx">'+t('stockList')+'</div></div>'+
      '<div class="act" onclick="App.go(\'except\')"><div class="ic">⚠️</div><div class="tx">'+t('exceptions')+'</div></div>'+
      '<div class="act" onclick="App.go(\'reports\')"><div class="ic">📄</div><div class="tx">'+t('exportReport')+'</div></div>'+
    '</div></div>'+
    '<div class="card"><h3>📊 Scan Quality</h3><canvas class="chart" id="ch-donut"></canvas></div>'+
    '<div class="card"><h3>📉 '+t('shortage')+' vs 📈 '+t('excess')+'</h3><canvas class="chart" id="ch-bars"></canvas></div>'+
    '<div class="card"><h3>🔥 '+t('topShort')+' <a href="#" style="float:right;font-size:12px" onclick="App.go(\'except\');return false">'+t('viewAll')+'</a></h3><div id="top-short"></div></div>';
    // charts
    drawDonut(document.getElementById('ch-donut'), [
      {l:t('matched'), v:C.MATCHED, c:'#3D9A6C'},
      {l:t('manual'), v:C.MANUAL, c:'#4A90D9'},
      {l:t('duplicate'), v:C.DUPLICATE, c:'#C08A2E'},
      {l:t('notFound'), v:C['NOT FOUND'], c:'#D16363'},
    ]);
    drawBars(document.getElementById('ch-bars'), [
      {l:t('shortage'), v:A.grossS, c:'#D16363', c2:'#E08080'},
      {l:t('excess'), v:A.excQ, c:'#3D9A6C', c2:'#5CB98A'},
      {l:t('matched'), v:C.MATCHED, c:'#20907F', c2:'#4CC3AC'},
    ]);
    const top = A.shorts.slice(0,5);
    document.getElementById('top-short').innerHTML = top.length ? top.map(r=>
      '<div class="list-item" onclick="App.openArticle(\''+r.a.key+'\')"><div class="r1"><span class="art">'+esc(r.a.art)+'</span>'+statusBadge('SHORT')+
      '<span style="flex:1"></span><b class="neg">'+r.d+'</b></div><div class="meta">Cat '+esc(r.a.cat)+' • '+fmtTk(r.a.price)+' • Sys '+r.a.system+' → Phy '+r.p+' • '+fmtTk(r.v)+'</div></div>'
    ).join('') : '<div class="empty"><div class="big">🎉</div><p>'+t('noIssues')+'</p></div>';
  },
  lookup(){
    const q=document.getElementById('ql-in').value, out=document.getElementById('ql-out');
    const s=activeSession(); if(!s) return;
    const r=lookupArticleOrBarcode(s.id,q);
    if(!r||r.type==='none'){ out.innerHTML='<div class="note">❌ '+t('noResult')+'</div>'; beep('err'); return; }
    beep('ok');
    if(r.type==='article'){
      out.innerHTML='<div class="list-item" onclick="App.openArticle(\''+r.a.key+'\')"><div class="r1"><span class="art">'+esc(r.a.art)+'</span>'+statusBadge(r.st)+
      '</div><div class="meta">Cat '+esc(r.a.cat)+' • '+fmtTk(r.a.price)+' • System '+r.a.system+' • Physical '+r.p+' • Diff <b>'+r.d+'</b> • Scans '+r.scans+'</div>'+
      '<div class="sm" style="font-size:12px;color:var(--sub)">👆 '+t('tapToView')+'</div></div>';
    } else {
      const x=r.scan;
      out.innerHTML='<div class="list-item"><div class="r1"><span class="art" style="font-size:13px;word-break:break-all">'+esc(x.barcode)+'</span></div><div style="margin-top:6px">'+statusBadge(x.status)+'</div><div class="meta">#'+x.n+' • '+esc(x.operator)+' • '+fmtTime(x.time)+'</div></div>';
    }
  }
};
