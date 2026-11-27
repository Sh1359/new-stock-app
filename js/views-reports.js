/* Shazim - Reports + Insights */
const VRep = {
  render(root){
    const s=activeSession(); if(!s){ root.innerHTML=''; return; }
    const C=aggregate(s.id).counts;
    root.innerHTML =
    '<div class="card"><h3>📄 '+t('varianceReport')+'</h3><p style="color:var(--sub);font-size:13px">'+t('varianceDesc')+'</p>'+
      '<div class="grid2"><div class="field"><label>'+t('reportType')+'</label><select id="rp-type"><option value="ALL">'+t('allIssues')+'</option><option value="SHORT">'+t('shortOnly')+'</option><option value="EXCESS">'+t('excessOnly')+'</option><option value="ALLART">'+t('fullList')+'</option></select></div>'+
      '<div class="field"><label>'+t('category')+'</label><select id="rp-cat"><option value="">'+t('allCat')+'</option>'+VStock.cats().map(c=>'<option>'+esc(c)+'</option>').join('')+'</select></div></div>'+
      '<div class="btn-row"><button class="btn btn-primary" onclick="VRep.preview()">👁️ '+t('preview')+'</button><button class="btn btn-soft" onclick="VRep.pdf()">🖨️ '+t('printPDF')+'</button><button class="btn btn-soft" onclick="VRep.csv()">⬇️ CSV</button></div></div>'+
    '<div class="card"><h3>📑 '+t('moreReports')+'</h3>'+
    '<div class="btn-row"><button class="btn btn-white btn-sm" onclick="App.exportLogCSV()">🧾 '+t('scanLog')+' CSV</button><button class="btn btn-white btn-sm" onclick="App.exportMasterCSV()">📦 '+t('master')+' CSV</button><button class="btn btn-white btn-sm" onclick="VRep.pdfSummary()">📋 '+t('summarySlip')+'</button></div></div>'+
    '<div id="rp-prev"></div>';
  },
  rows(){
    const s=activeSession(), A=aggregate(s.id);
    let rows=A.rows.slice();
    const ty=document.getElementById('rp-type').value, cat=document.getElementById('rp-cat').value;
    if(ty==='SHORT') rows=rows.filter(r=>r.d<0);
    else if(ty==='EXCESS') rows=rows.filter(r=>r.d>0);
    else if(ty==='ALL') rows=rows.filter(r=>r.d!==0);
    if(cat) rows=rows.filter(r=>r.a.cat===cat);
    rows.sort((x,y)=>Math.abs(y.v)-Math.abs(x.v));
    return rows;
  },
  head(extra){
    const s=activeSession();
    return '<div class="print-head"><div class="print-logo">Shazim</div><div class="print-title">'+t('appName')+' — '+t('varianceReport')+'</div>'+
    '<div class="print-meta">'+esc(s.name)+' • '+esc(currentUser().name)+' • '+fmtDateTime(Date.now())+(extra||'')+'</div></div>';
  },
  foot(){ return '<div class="print-sign"><div>'+t('preparedBy')+' __________</div><div>'+t('checkedBy')+' __________</div><div>'+t('signDate')+' ___/___/___</div></div>'; },
  table(rows){
    return '<table class="print-table"><thead><tr><th>#</th><th>'+t('thArt')+'</th><th>'+t('thCat')+'</th><th>'+t('thSys')+'</th><th>'+t('thPhy')+'</th><th>'+t('thDiff')+'</th><th>'+t('thPrice')+'</th><th>'+t('thVar')+'</th></tr></thead><tbody>'+
    rows.map((r,i)=>'<tr><td>'+(i+1)+'</td><td><b>'+esc(r.a.art)+'</b></td><td>'+esc(r.a.cat)+'</td><td>'+r.a.system+'</td><td>'+r.p+'</td><td><b>'+(r.d>0?'+':'')+r.d+'</b></td><td>'+fmtTk(r.a.price)+'</td><td><b>'+fmtTk(r.v)+'</b></td></tr>').join('')+'</tbody></table>';
  },
  preview(){
    const rows=this.rows();
    const totV=rows.reduce((x,r)=>x+r.v,0);
    document.getElementById('rp-prev').innerHTML='<div class="card print-area" id="printable">'+this.head(' • '+rows.length+' '+t('foundX'))+
    '<div class="print-totals"><span>'+t('recCount')+': <b>'+rows.length+'</b></span><span>'+t('totVariance')+': <b>'+fmtTk(totV)+'</b></span></div>'+
    '<div style="overflow-x:auto">'+this.table(rows)+'</div>'+this.foot()+'</div>';
    document.getElementById('rp-prev').scrollIntoView({behavior:'smooth'});
  },
  pdf(){
    if(!document.getElementById('printable')) this.preview();
    audit('report.print', 'variance'); saveDB();
    setTimeout(()=>window.print(), 150);
  },
  csv(){
    const rows=this.rows(), s=activeSession();
    const head='Article,Category,System,Physical,Diff,Price,Variance\n';
    const body=rows.map(r=>[r.a.art,r.a.cat,r.a.system,r.p,r.d,r.a.price,r.v].join(',')).join('\n');
    download('variance-'+slug(s.name)+'.csv', head+body, 'text/csv');
    audit('report.csv','variance'); saveDB(); toast(t('downloaded'));
  },
  pdfSummary(){
    const s=activeSession(), A=aggregate(s.id), C=A.counts;
    openModal('<div class="print-area" id="printable">'+this.head()+
    '<div class="print-totals"><span>🧾 '+t('totalScan')+': <b>'+fmtNum(C.total)+'</b></span><span>✅ M: <b>'+fmtNum(C.MATCHED)+'</b></span><span>✍️: <b>'+fmtNum(C.MANUAL)+'</b></span><span>⛔: <b>'+fmtNum(C.DUPLICATE)+'</b></span><span>❓: <b>'+fmtNum(C['NOT FOUND'])+'</b></span></div>'+
    '<table class="print-table"><tbody>'+
    '<tr><td>📦 '+t('sysStock')+'</td><td><b>'+fmtNum(A.sysQ)+'</b></td><td>'+fmtTk(A.sysV)+'</td></tr>'+
    '<tr><td>📋 '+t('phyStock')+'</td><td><b>'+fmtNum(A.phyQ)+'</b></td><td>'+fmtTk(A.phyV)+'</td></tr>'+
    '<tr><td>📉 '+t('grossShort')+'</td><td><b>'+fmtNum(A.grossS)+'</b></td><td>'+fmtTk(A.grossSV)+'</td></tr>'+
    '<tr><td>📈 '+t('excessQ')+'</td><td><b>+'+fmtNum(A.excQ)+'</b></td><td>'+fmtTk(A.excV)+'</td></tr>'+
    '<tr><td>➖ '+t('netDiff')+'</td><td><b>'+fmtNum(A.netQ)+'</b></td><td>'+fmtTk(A.netV)+'</td></tr></tbody></table>'+
    '<p>📉 SHORT items: <b>'+A.shorts.length+'</b> • 📈 EXCESS items: <b>'+A.excess.length+'</b></p>'+this.foot()+
    '</div><div class="btn-row"><button class="btn btn-soft" onclick="closeModal()">'+t('close')+'</button><button class="btn btn-primary" onclick="closeModal();setTimeout(()=>window.print(),150)">🖨️ '+t('printPDF')+'</button></div>');
    audit('report.print','summary'); saveDB();
  }
};

const VIns = {
  render(root){
    const s=activeSession(); if(!s){ root.innerHTML=''; return; }
    const A=aggregate(s.id), C=A.counts;
    const acc = s.imported ? null : (C.total? Math.round((C.MATCHED+C.MANUAL)/C.total*100):100);
    const cov = Math.round(A.rows.filter(r=>r.p>0).length/A.rows.length*100);
    const byOp={}, byHour=new Array(24).fill(0);
    sessionScans(s.id).forEach(r=>{ byOp[r.operator||'?']=(byOp[r.operator||'?']||0)+1; const h=new Date(r.time).getHours(); byHour[h]++; });
    const ops=Object.keys(byOp).sort((a,b)=>byOp[b]-byOp[a]).slice(0,6);
    const pkH=byHour.indexOf(Math.max.apply(null,byHour));
    const zero=A.rows.filter(r=>r.p===0);
    const noMove=A.rows.filter(r=>r.a.system>0&&r.p===0);
    root.innerHTML =
    '<div class="kpis">'+
      '<div class="kpi orange"><div class="bar-top"></div><div class="lb">🎯 '+t('accuracy')+'</div><div class="vl">'+(acc===null?'—':acc+'%')+'</div><div class="sm">'+(s.imported?t('archiveNote').slice(0,24):t('matched')+'/'+t('total'))+'</div></div>'+
      '<div class="kpi amber"><div class="lb">📦 '+t('coverage')+'</div><div class="vl">'+cov+'%</div><div class="sm">'+fmtNum(A.rows.filter(r=>r.p>0).length)+'/'+fmtNum(A.rows.length)+'</div></div>'+
      '<div class="kpi red"><div class="lb">🕸️ '+t('noMove')+'</div><div class="vl">'+noMove.length+'</div></div>'+
      '<div class="kpi green"><div class="lb">⏰ '+t('peakHour')+'</div><div class="vl">'+(C.total?pkH+':00':'—')+'</div></div>'+
    '</div>'+
    '<div class="card"><h3>👥 '+t('opBoard')+'</h3><canvas class="chart" id="ch-ops"></canvas></div>'+
    '<div class="card"><h3>📂 '+t('catHeat')+'</h3><div id="ch-cats"></div></div>'+
    '<div class="card"><h3>💡 '+t('suggest')+'</h3><div id="sg-list"></div></div>';
    drawBars(document.getElementById('ch-ops'), ops.map((o,i)=>({l:o.slice(0,12), v:byOp[o], c:['#F97316','#0EA5E9','#16A34A','#A855F7','#EC4899','#F59E0B'][i%6]})) );
    // category heat: top shorts by category
    const cb={}; A.shorts.forEach(r=>{ cb[r.a.cat]=cb[r.a.cat]||{n:0,v:0}; cb[r.a.cat].n++; cb[r.a.cat].v+=Math.abs(r.v); });
    const ck=Object.keys(cb).sort((a,b)=>cb[b].v-cb[a].v).slice(0,8);
    document.getElementById('ch-cats').innerHTML=ck.length?ck.map(k=>'<div class="mrow"><b>Cat '+esc(k)+'</b><span style="flex:1"></span><span>'+cb[k].n+' items</span><b class="neg">'+fmtTk(-cb[k].v)+'</b></div>').join(''):'<div class="empty"><p>✅</p></div>';
    // suggestions
    const sg=[];
    if(A.shorts.length) sg.push(['📉', t('sgRecount').replace('{n}', A.shorts.slice(0,3).map(r=>r.a.art).join(', '))]);
    if(A.excess.length) sg.push(['📈', t('sgExcess')]);
    const nfN=C['NOT FOUND']; if(nfN) sg.push(['❓', t('sgNF').replace('{n}',nfN)]);
    if(C.DUPLICATE> (C.total*0.02)) sg.push(['⛔', t('sgDup')]);
    if(s.imported) sg.push(['🗂️', t('sgFresh')]);
    if(!sg.length) sg.push(['🎉', t('sgGreat')]);
    document.getElementById('sg-list').innerHTML=sg.map(x=>'<div class="mrow"><span style="font-size:20px">'+x[0]+'</span><span style="flex:1;font-size:14px">'+x[1]+'</span></div>').join('');
  }
};
