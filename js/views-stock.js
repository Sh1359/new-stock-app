/* Shazim - Stock list + article detail */
const VStock = {
  q:'', f:'ALL', cat:'', sort:'diff', shown:80,
  cats(){ const s=new Set(ARTICLES.map(a=>a.cat)); return Array.from(s).sort(); },
  render(root){
    const s=activeSession(); if(!s){ root.innerHTML=''; return; }
    const A=aggregate(s.id);
    const cats=this.cats().map(c=>'<option value="'+esc(c)+'"'+(this.cat===c?' selected':'')+'>'+esc(c)+'</option>').join('');
    root.innerHTML =
    '<div class="searchbar"><input id="st-q" placeholder="'+t('searchArt')+'" value="'+esc(this.q)+'" oninput="VStock.q=this.value;VStock.shown=80;VStock.list()"></div>'+
    '<div class="chips">'+
      ['ALL','SHORT','EXCESS','MATCH','ZERO'].map(f=>'<button class="chip orange'+(this.f===f?' on':'')+'" onclick="VStock.f=\''+f+'\';VStock.shown=80;VStock.render(document.getElementById(\'view\'))">'+(f==='ALL'?t('all'):f==='SHORT'?t('short'):f==='EXCESS'?t('excess'):f==='MATCH'?t('match'):t('zeroStock'))+'</button>').join('')+
    '</div>'+
    '<div class="grid2" style="margin-bottom:10px"><div class="field"><label>'+t('category')+'</label><select onchange="VStock.cat=this.value;VStock.shown=80;VStock.list()"><option value="">'+t('allCat')+'</option>'+cats+'</select></div>'+
    '<div class="field"><label>'+t('sortBy')+'</label><select onchange="VStock.sort=this.value;VStock.list()">'+
      '<option value="diff"'+(this.sort==='diff'?' selected':'')+'>'+t('byDiff')+'</option><option value="art"'+(this.sort==='art'?' selected':'')+'>'+t('byArt')+'</option><option value="val"'+(this.sort==='val'?' selected':'')+'>'+t('byValue')+'</option></select></div></div>'+
    '<div id="st-meta" style="font-size:12.5px;color:var(--sub);margin-bottom:8px"></div>'+
    '<div id="st-list"></div><div style="text-align:center;margin:10px"><button class="btn btn-soft btn-sm" id="st-more" onclick="VStock.shown+=120;VStock.list()">'+t('loadMore')+'</button></div>';
    this.A=A; this.list();
  },
  lastOp(key){
    const h=this.A.artScans[key];
    if(h&&h.length) return h[h.length-1].operator||'';
    return '';
  },
  filtered(){
    let rows=this.A.rows.slice();
    if(this.f==='SHORT') rows=rows.filter(r=>r.d<0);
    else if(this.f==='EXCESS') rows=rows.filter(r=>r.d>0);
    else if(this.f==='MATCH') rows=rows.filter(r=>r.d===0);
    else if(this.f==='ZERO') rows=rows.filter(r=>r.p===0);
    if(this.cat) rows=rows.filter(r=>r.a.cat===this.cat);
    if(this.q){ const q=normKey(this.q); rows=rows.filter(r=>r.a.art.replace('-','').includes(q)||r.a.art.includes(this.q)); }
    if(this.sort==='diff') rows.sort((x,y)=>Math.abs(y.d)-Math.abs(x.d));
    else if(this.sort==='val') rows.sort((x,y)=>Math.abs(y.v)-Math.abs(x.v));
    else rows.sort((x,y)=>x.a.art<y.a.art?-1:1);
    return rows;
  },
  list(){
    const rows=this.filtered(), el=document.getElementById('st-list');
    document.getElementById('st-meta').textContent=t('showing')+' '+Math.min(this.shown,rows.length)+' '+t('of')+' '+fmtNum(rows.length)+' • '+rows.length+' '+t('foundX');
    const more=document.getElementById('st-more'); if(more) more.style.display = rows.length>this.shown?'':'none';
    el.innerHTML=rows.slice(0,this.shown).map(r=>{
      const op=this.lastOp(r.a.key);
      return '<div class="list-item" onclick="App.openArticle(\''+r.a.key+'\')"><div class="r1"><span class="art">'+esc(r.a.art)+'</span>'+statusBadge(r.st)+
      (op?'<span class="op-tag">👤 '+esc(op)+'</span>':'')+
      '<span style="flex:1"></span><b class="'+(r.d<0?'neg':r.d>0?'pos':'')+'">'+(r.d>0?'+':'')+r.d+'</b></div>'+
      '<div class="meta">Cat '+esc(r.a.cat)+' • '+fmtTk(r.a.price)+' • Sys <b>'+r.a.system+'</b> → Phy <b>'+r.p+'</b> • '+fmtTk(r.v)+'</div></div>';
    }).join('') || '<div class="empty"><div class="big">🔍</div><p>'+t('noResult')+'</p></div>';
  },
  detail(key){
    const s=activeSession(), A=aggregate(s.id);
    const r=A.rows.find(x=>x.a.key===key); if(!r) return;
    const hist=(A.artScans[key]||[]).slice().reverse();
    const res=DB.resolutions[key];
    const opc={}; hist.forEach(x=>{ opc[x.operator||'?']=(opc[x.operator||'?']||0)+x.qty; });
    const opLine=Object.keys(opc).sort((a,b)=>opc[b]-opc[a]).slice(0,3).map(o=>'<span class="op-tag">👤 '+esc(o)+' ×'+opc[o]+'</span>').join('');
    openModal('<h3>📦 '+esc(r.a.art)+' '+statusBadge(r.st)+'</h3>'+
      (opLine?'<div style="margin-bottom:8px">'+t('scannedBy')+': '+opLine+'</div>':'')+
      '<div class="recon-row"><span class="k">'+t('cat')+'</span><span class="v">'+esc(r.a.cat)+'</span></div>'+
      '<div class="recon-row"><span class="k">'+t('price')+'</span><span class="v">'+fmtTk(r.a.price)+'</span></div>'+
      '<div class="recon-row"><span class="k">'+t('system')+'</span><span class="v">'+r.a.system+'</span></div>'+
      '<div class="recon-row"><span class="k">'+t('physical')+'</span><span class="v">'+r.p+'</span></div>'+
      '<div class="recon-row"><span class="k">'+t('diff')+'</span><span class="v '+(r.d<0?'neg':r.d>0?'pos':'')+'">'+r.d+'</span></div>'+
      '<div class="recon-row"><span class="k">'+t('variance')+'</span><span class="v">'+fmtTk(r.v)+'</span></div>'+
      '<div class="recon-row"><span class="k">'+t('sysVal')+'</span><span class="v">'+fmtTk(r.sv)+'</span></div>'+
      '<div class="recon-row"><span class="k">'+t('phyVal')+'</span><span class="v">'+fmtTk(r.pv)+'</span></div>'+
      (r.a.extra?'<div class="recon-row"><span class="k">'+t('upsale')+'</span><span class="v">'+esc(r.a.extra)+'</span></div>':'')+
      (res?'<div class="note">✅ '+t('resolution')+': <b>'+esc(res.action)+'</b> — '+esc(res.by)+' • '+fmtTime(res.at)+'</div>':'')+
      '<div class="btn-row"><button class="btn btn-soft" onclick="closeModal();App.go(\'scan\')">📷 '+t('scanNow')+'</button>'+
      (r.d!==0?'<button class="btn btn-primary" onclick="VStock.resolve(\''+key+'\',\''+r.st+'\')">🛠️ '+t('resolve')+'</button>':'')+'</div>'+
      '<h3 style="margin-top:14px">🧾 '+t('scanHistory')+' ('+hist.length+')</h3>'+
      (hist.length?hist.slice(0,60).map(x=>'<div class="mrow">'+statusBadge(x.status)+'<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px">'+(x.barcode?esc(x.barcode.slice(0,30))+'…':'✍️ ×'+x.qty)+'</span><small style="color:var(--sub)">'+esc(x.operator||'')+' '+fmtTime(x.time)+'</small></div>').join(''):'<div class="empty"><p>'+t('noHistory')+'</p></div>')+
      '<div class="btn-row"><button class="btn btn-white" onclick="closeModal()">'+t('close')+'</button></div>');
  },
  resolve(key, kind){
    openModal('<h3>🛠️ '+t('resolve')+' — '+fmtKey(key)+'</h3>'+
      '<div class="field"><label>'+t('resolution')+'</label><select id="rs-act"><option>'+t('recount')+'</option><option>'+t('accept')+'</option><option>'+t('ignore')+'</option></select></div>'+
      '<div class="field"><label>'+t('notes')+'</label><input id="rs-note" placeholder="..."></div>'+
      '<div class="btn-row"><button class="btn btn-soft" onclick="closeModal()">'+t('cancel')+'</button><button class="btn btn-primary" onclick="VStock.doResolve(\''+key+'\')">'+t('save')+'</button></div>');
  },
  doResolve(key){
    const act=document.getElementById('rs-act').value, note=document.getElementById('rs-note').value;
    DB.resolutions[key]={action:act+(note?' — '+note:''), by:currentUser().name, at:Date.now()};
    saveDB(); audit('resolve', fmtKey(key)+' '+act); closeModal(); toast(t('saved')); App.refresh();
  }
};
