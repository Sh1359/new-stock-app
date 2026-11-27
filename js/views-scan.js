/* Shazim - Scan view (camera / device / manual) */
const VScan = {
  mode:'cam', stream:null, detector:null, rafId:0, lastDetect:0, lastCode:'', lastAt:0, photoData:null, torchOn:false,
  stop(){ // cleanup camera when leaving
    try{ cancelAnimationFrame(this.rafId); }catch(e){}
    this.rafId=0;
    if(this.stream){ try{ this.stream.getTracks().forEach(x=>x.stop()); }catch(e){} this.stream=null; }
  },
  render(root){
    const s=activeSession();
    if(!s){ root.innerHTML='<div class="empty"><div class="big">🗂️</div></div>'; return; }
    if(!this._init){ this._init=true; this.mode=(DB.settings.defMode==='dev'||DB.settings.defMode==='man')?DB.settings.defMode:'cam'; }
    this.photoData=null;
    root.innerHTML =
    '<div class="mode-tabs">'+
      '<button id="mt-cam" class="'+(this.mode==='cam'?'on':'')+'" onclick="VScan.setMode(\'cam\')">📷 '+t('camMode').replace('📷 ','')+'</button>'+
      '<button id="mt-dev" class="'+(this.mode==='dev'?'on':'')+'" onclick="VScan.setMode(\'dev\')">⌨️ '+t('devMode').replace('⌨️ ','')+'</button>'+
      '<button id="mt-man" class="'+(this.mode==='man'?'on':'')+'" onclick="VScan.setMode(\'man\')">✍️ '+t('manMode').replace('✍️ ','')+'</button>'+
    '</div>'+
    '<div id="scan-body"></div>'+
    '<div class="card"><h3>🕘 '+t('lastScans')+'</h3><div class="mini-log" id="mini-log"></div></div>';
    this.renderBody(); this.miniLog(); this.counters();
  },
  setMode(m){ this.stop(); this.mode=m; this.render(document.getElementById('view')); renderChrome('scan'); },
  renderBody(){
    const el=document.getElementById('scan-body');
    if(this.mode==='cam'){
      el.innerHTML='<div class="card"><div class="viewfinder" id="vf"><video id="cam" playsinline muted></video><div class="scan-frame"></div><div class="scan-hint" id="cam-msg">'+t('startingCam')+'</div></div>'+
      '<div class="btn-row"><button class="btn btn-soft btn-sm" id="btn-torch" onclick="VScan.torch()">'+t('torch')+'</button><button class="btn btn-soft btn-sm" onclick="VScan.setMode(\'dev\')">⌨️ Scanner</button></div></div>'+
      '<div class="result-card" id="res"></div><div id="scan-counters"></div>';
      this.startCam();
    } else if(this.mode==='dev'){
      el.innerHTML='<div class="card"><div class="field"><label>⌨️ '+t('fullBarcode')+'</label>'+
        '<input id="dev-in" class="big-input" placeholder="'+t('scanHerePh')+'" autocomplete="off" onkeydown="if(event.key===\'Enter\'){VScan.submitDevice();}">'+
        '<div class="btn-row"><button class="btn btn-soft" onclick="VScan.torchClear()">✖</button><button class="btn btn-primary" onclick="VScan.submitDevice()">➕ '+t('submit')+'</button></div></div>'+
        this.notePhotoFields()+'</div><div class="result-card" id="res"></div><div id="scan-counters"></div>';
      setTimeout(()=>{ const i=document.getElementById('dev-in'); if(i) i.focus(); },100);
    } else {
      el.innerHTML='<div class="card"><div class="field"><label>✍️ '+t('manualArt')+'</label>'+
        '<input id="man-in" class="big-input" inputmode="numeric" maxlength="8" placeholder="'+t('manualPh')+'" autocomplete="off"></div>'+
        '<div class="field"><label>🔢 '+t('pairQty')+'</label><input id="man-q" type="number" min="1" max="9999" placeholder="1" inputmode="numeric"></div>'+
        '<div class="note">💡 '+t('bulkNote')+' — '+t('blankIs1')+'</div>'+
        '<div class="btn-row"><button class="btn btn-primary" onclick="VScan.submitManual()">➕ '+t('submit')+'</button></div>'+
        this.notePhotoFields()+'</div><div class="result-card" id="res"></div><div id="scan-counters"></div>';
    }
  },
  notePhotoFields(){
    return '<div class="field" style="margin-top:10px"><label>📝 '+t('notes')+'</label><input id="sc-notes" placeholder="'+t('notesPh')+'"></div>'+
    '<div class="field"><label>'+t('addPhoto')+'</label><input type="file" id="sc-photo" accept="image/*" capture="environment" onchange="VScan.pickPhoto(this)"><img id="sc-prev" class="photo-thumb" style="display:none"></div>';
  },
  pickPhoto(inp){
    const f=inp.files&&inp.files[0]; if(!f) return;
    const img=new Image();
    img.onload=()=>{ const cv=document.createElement('canvas'); const mx=800;
      const sc=Math.min(1, mx/Math.max(img.width,img.height));
      cv.width=img.width*sc; cv.height=img.height*sc;
      cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
      VScan.photoData=cv.toDataURL('image/jpeg',.7);
      const p=document.getElementById('sc-prev'); p.src=VScan.photoData; p.style.display='block';
      URL.revokeObjectURL(img.src); };
    img.src=URL.createObjectURL(f);
  },
  torchClear(){ const i=document.getElementById('dev-in'); if(i){ i.value=''; i.focus(); } },
  /* ---- camera ---- */
  async startCam(){
    const msg=document.getElementById('cam-msg'), video=document.getElementById('cam');
    if(!('BarcodeDetector' in window)){ msg.textContent=t('noBD'); return; }
    try{
      let fmts=[]; try{ fmts=await BarcodeDetector.getSupportedFormats(); }catch(e){}
      const want=['code_128','code_39','code_93','codabar','ean_13','ean_8','itf','upc_a','upc_e','qr_code','data_matrix'];
      const use=fmts.length?want.filter(f=>fmts.includes(f)):undefined;
      this.detector=new BarcodeDetector(use&&use.length?{formats:use}:undefined);
    }catch(e){ msg.textContent=t('noBD'); return; }
    try{
      this.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}, audio:false});
    }catch(e){ msg.textContent=t('camDenied'); return; }
    video.srcObject=this.stream; await video.play().catch(()=>{});
    msg.textContent=t('scanHint');
    const loop=async()=>{
      if(!this.stream) return;
      const now=Date.now();
      if(now-this.lastDetect>350 && video.readyState===video.HAVE_ENOUGH_DATA){
        this.lastDetect=now;
        try{
          const codes=await this.detector.detect(video);
          if(codes&&codes.length){
            const val=codes[0].rawValue||'';
            if(val && (val!==this.lastCode || now-this.lastAt>2500)){
              this.lastCode=val; this.lastAt=now;
              this.submitBarcode(val);
              if(!DB.settings.continuous){ this.stop(); const m=document.getElementById('cam-msg'); if(m) m.textContent='⏸️'; return; }
            }
          }
        }catch(e){}
      }
      this.rafId=requestAnimationFrame(loop);
    };
    loop();
  },
  async torch(){
    try{
      const tr=this.stream&&this.stream.getVideoTracks()[0];
      if(!tr) return toast('—');
      this.torchOn=!this.torchOn;
      await tr.applyConstraints({advanced:[{torch:this.torchOn}]});
    }catch(e){ toast('🔦 —'); }
  },
  /* ---- submit ---- */
  extra(){
    const n=document.getElementById('sc-notes');
    return {notes:n?n.value.trim():'', photo:this.photoData, mode:this.mode==='dev'?'device':this.mode};
  },
  submitBarcode(code){
    const s=activeSession(); if(!s) return;
    const rec=addScan(s.id,{barcode:code},{operator:currentUser().name});
    this.showResult(rec); this.miniLog(); this.counters();
  },
  submitDevice(){
    const inp=document.getElementById('dev-in'); if(!inp) return;
    const code=inp.value.trim(); if(!code) return;
    const s=activeSession();
    const rec=addScan(s.id,{barcode:code},this.extra());
    inp.value=''; inp.focus();
    this.showResult(rec); this.miniLog(); this.counters();
    const n=document.getElementById('sc-notes'); if(n) n.value='';
    this.photoData=null; const p=document.getElementById('sc-prev'); if(p) p.style.display='none';
  },
  submitManual(){
    const m=document.getElementById('man-in'), q=document.getElementById('man-q');
    const s=activeSession();
    const rec=addScan(s.id,{manual:m.value,qty:q.value},this.extra());
    m.value=''; q.value=''; m.focus();
    this.showResult(rec); this.miniLog(); this.counters();
    const n=document.getElementById('sc-notes'); if(n) n.value='';
    this.photoData=null;
  },
  showResult(rec){
    const box=document.getElementById('res'); if(!box) return;
    const s=activeSession(), A=aggregate(s.id);
    let cls='', head='', sub='';
    if(rec.status==='MATCHED'||rec.status==='MANUAL'){
      const a=ART_MAP[rec.key]; const p=A.phys[rec.key]||0;
      cls='ok'; head=(rec.status==='MATCHED'?t('okMatched'):t('okManual'));
      sub='<b>'+esc(rec.art)+'</b> • '+t('counted')+': <b>'+p+'</b> / Sys '+a.system+' • +'+rec.qty;
      beep('ok'); buzz(40);
    } else if(rec.status==='DUPLICATE'){
      cls='dup'; head=t('warnDup'); sub='<span style="word-break:break-all">'+esc(rec.barcode)+'</span><br>'+t('dupMsg');
      beep('dup'); buzz([80,60,80]);
    } else if(rec.status==='NOT FOUND'){
      cls='err'; head=t('errNF');
      sub=fmtKey(rec.attKey||'')+' — '+t('nfMsg')+'<div class="btn-row"><button class="btn btn-primary btn-sm" onclick="App.addArticlePrefill(\''+esc(rec.attKey||'')+'\')\">＋ '+t('addToMaster')+'</button></div>';
      beep('err'); buzz(150);
    } else {
      cls='err'; head=t('errInv'); sub=t('invMsg');
      beep('err'); buzz(150);
    }
    box.className='result-card show '+cls;
    box.innerHTML='<div class="big">'+head+'</div><div class="sub">'+sub+'</div>';
  },
  miniLog(){
    const el=document.getElementById('mini-log'); if(!el) return;
    const s=activeSession(); const rows=sessionScans(s.id).slice(-8).reverse();
    el.innerHTML=rows.length?rows.map(r=>'<div class="mrow">'+statusBadge(r.status)+
      '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>'+esc(r.art||fmtKey(r.attKey||''))+'</b> <small style="color:var(--sub)">'+(r.barcode?esc(r.barcode.slice(0,18))+'…':'✍️ ×'+r.qty)+'</small></span>'+
      '<small style="color:var(--sub)">'+fmtTime(r.time)+'</small></div>').join(''):
      '<div class="empty" style="padding:12px"><p>'+t('noScans')+'</p></div>';
  },
  counters(){
    const el=document.getElementById('scan-counters'); if(!el) return;
    const s=activeSession(); const C=aggregate(s.id).counts;
    el.innerHTML='<div class="scan-counters">'+
      '<div class="c"><b>'+fmtNum(C.total)+'</b><span>'+t('total')+'</span></div>'+
      '<div class="c"><b style="color:var(--green)">'+fmtNum(C.MATCHED+C.MANUAL)+'</b><span>✅</span></div>'+
      '<div class="c"><b style="color:var(--amber)">'+fmtNum(C.DUPLICATE)+'</b><span>⛔</span></div>'+
      '<div class="c"><b style="color:var(--red)">'+fmtNum(C['NOT FOUND']+C.INVALID)+'</b><span>❓</span></div></div>';
  }
};
