(()=>{
const $=(t,a={},...kids)=>{const e=document.createElement(t);for(const[k,v]of Object.entries(a)){if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else if(k==='hidden')e.hidden=!!v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v)}for(const c of kids)if(c!=null)e.append(c);return e};
const fmt=s=>s.toFixed(1)+'s';
const r1=t=>Math.round(Number(t)*10)/10;
const POSITIONS=['P','C','1B','2B','SS','3B','LF','CF','RF'];
const EDIT_KEY='cliplib-segment-edits';
const players=[];
const ORIG={};
let DATA=null;

function pauseOthers(v){for(const p of players)if(p.video!==v&&!p.video.paused)p.video.pause()}
function posVar(p){return p}
function applyRate(st){st.video.defaultPlaybackRate=st.rate;st.video.playbackRate=st.rate}
function seek(st,t){st.internal=true;st.video.currentTime=t}
function clearRange(st){st.range=null;for(const b of st.btns)b.setAttribute('aria-pressed','false');for(const s of st.play.segments)if(s._bar)s._bar.classList.remove('active');st.now.classList.remove('show')}
async function start(st,a,b,btn,label,bar){
  const v=st.video;pauseOthers(v);
  if(v.readyState<1){v.load();await new Promise(r=>v.addEventListener('loadedmetadata',r,{once:true}))}
  clearRange(st);
  st.range=[a,b];btn.setAttribute('aria-pressed','true');if(bar)bar.classList.add('active');
  st.now.textContent=label+(st.rate!==1?' · '+st.rate+'×':'');st.now.classList.add('show');
  applyRate(st);seek(st,a);
  try{await v.play()}catch(e){}
  applyRate(st);
}
function drawHead(st){const v=st.video;const d=v.duration||st.play.duration;st.head.style.setProperty('--p',Math.min(1,v.currentTime/d))}
function loop(st){
  cancelAnimationFrame(st.raf);
  const tick=()=>{const v=st.video;drawHead(st);
    if(st.range&&!v.seeking&&v.currentTime>=st.range[1]-0.01){
      if(st.loop){seek(st,st.range[0]);}
      else{v.pause();return}
    }
    if(!v.paused)st.raf=requestAnimationFrame(tick)};
  st.raf=requestAnimationFrame(tick);
}
function durOf(st){
  const d=st.video&&isFinite(st.video.duration)&&st.video.duration>0?st.video.duration:st.play.duration;
  return d||0;
}
function slim(s){return {pos:s.pos,label:s.label,start:r1(s.start),end:r1(s.end)}}
function segsDiffer(a,b){
  if(!a||!b||a.length!==b.length)return true;
  return a.some((s,i)=>s.pos!==b[i].pos||s.label!==b[i].label||r1(s.start)!==r1(b[i].start)||r1(s.end)!==r1(b[i].end));
}
function rowEdited(play,i){
  const orig=ORIG[play.id];
  if(!orig)return false;
  const s=play.segments[i];
  if(!s)return false;
  if(i>=orig.length)return true;
  const o=orig[i];
  return s.pos!==o.pos||s.label!==o.label||r1(s.start)!==r1(o.start)||r1(s.end)!==r1(o.end);
}
function barStyle(s,dur){return `left:${s.start/dur*100}%;width:${(s.end-s.start)/dur*100}%;background:var(--${posVar(s.pos)})`}

function isEditFlag(){
  const q=new URLSearchParams(location.search);
  if(!q.has('edit'))return false;
  const v=(q.get('edit')||'').toLowerCase();
  return v!=='0'&&v!=='false'&&v!=='off'&&v!=='no';
}
function layoutEditChrome(){
  const bar=document.getElementById('edit-bar');
  const h=(!bar||bar.hidden)?0:bar.offsetHeight;
  document.documentElement.style.setProperty('--edit-bar-h',h+'px');
}
function setEditing(on){
  document.body.classList.toggle('editing',on);
  const url=new URL(location.href);
  if(on)url.searchParams.set('edit','1');
  else url.searchParams.delete('edit');
  history.replaceState(null,'',url.pathname+url.search+url.hash);
  const link=document.getElementById('edit-toggle');
  if(link){
    link.textContent=on?'Done editing':'Edit segments';
    link.setAttribute('aria-pressed',String(on));
    const keep=location.hash||'';
    link.setAttribute('href',on?(location.pathname+(location.search.replace(/[?&]edit=[^&]*/,'').replace(/^&/,'?').replace(/\?$/,'')||'')+keep):('?edit=1'+keep));
  }
  const bar=document.getElementById('edit-bar');
  const dock=document.getElementById('edit-dock');
  if(bar)bar.hidden=!on;
  if(dock)dock.hidden=!on;
  layoutEditChrome();
  updateChangeCount();
}
function loadStore(){try{return JSON.parse(localStorage.getItem(EDIT_KEY)||'{}')}catch(e){return{}}}
function snapshotOriginals(data){
  for(const c of data.categories)for(const p of c.plays)ORIG[p.id]=p.segments.map(s=>({pos:s.pos,label:s.label,start:s.start,end:s.end,confidence:s.confidence,note:s.note}));
}
function applyStoredEdits(data){
  const store=loadStore();
  for(const c of data.categories){
    for(const p of c.plays){
      const e=store[p.id];
      if(!e)continue;
      if(Array.isArray(e.segments)){
        p.segments=e.segments.map(s=>({pos:s.pos,label:s.label,start:r1(s.start),end:r1(s.end),confidence:s.confidence,note:s.note}));
      }else if(e.patches){
        for(const [k,patch] of Object.entries(e.patches)){
          const s=p.segments[+k];
          if(!s||!patch)continue;
          if(patch.start!=null)s.start=r1(patch.start);
          if(patch.end!=null)s.end=r1(patch.end);
          if(patch.label!=null)s.label=patch.label;
          if(patch.pos!=null)s.pos=patch.pos;
        }
      }
    }
  }
}
function persistEdits(){
  if(!DATA)return;
  const out={};
  for(const c of DATA.categories){
    for(const p of c.plays){
      const orig=ORIG[p.id];
      if(!orig||!segsDiffer(p.segments,orig))continue;
      if(p.segments.length!==orig.length){
        out[p.id]={segments:p.segments.map(s=>slim(s))};
      }else{
        const patches={};
        p.segments.forEach((s,i)=>{
          const o=orig[i];
          if(s.pos!==o.pos||s.label!==o.label||r1(s.start)!==r1(o.start)||r1(s.end)!==r1(o.end)){
            patches[i]={pos:s.pos,label:s.label,start:r1(s.start),end:r1(s.end)};
          }
        });
        out[p.id]={patches};
      }
    }
  }
  try{
    if(Object.keys(out).length)localStorage.setItem(EDIT_KEY,JSON.stringify(out));
    else localStorage.removeItem(EDIT_KEY);
  }catch(e){setStatus('Could not save on this device. Copy your changes so they are not lost.','err')}
  updateChangeCount();
}
function collectChanges(){
  if(!DATA)return[];
  const changes=[];
  for(const c of DATA.categories){
    for(const p of c.plays){
      const orig=ORIG[p.id];
      if(!orig||!segsDiffer(p.segments,orig))continue;
      if(p.segments.length!==orig.length){
        changes.push({id:p.id,segments:p.segments.map(s=>slim(s))});
        continue;
      }
      p.segments.forEach((s,i)=>{
        const o=orig[i];
        if(s.pos!==o.pos||s.label!==o.label||r1(s.start)!==r1(o.start)||r1(s.end)!==r1(o.end)){
          changes.push({id:p.id,i,pos:s.pos,label:s.label,start:r1(s.start),end:r1(s.end)});
        }
      });
    }
  }
  return changes;
}
function updateChangeCount(){
  const n=DATA?collectChanges().length:0;
  const label=n===0?'No changes':(n===1?'1 change':n+' changes');
  const a=document.getElementById('edit-count');
  const b=document.getElementById('edit-dock-count');
  if(a)a.textContent=label;
  if(b)b.textContent=label;
}
function setStatus(msg,kind){
  const el=document.getElementById('edit-status');
  if(!el)return;
  el.textContent=msg||'';
  el.className='edit-status'+(kind?' '+kind:'');
  layoutEditChrome();
}
async function copyChanges(){
  const changes=collectChanges();
  if(!changes.length){setStatus('No changes to copy yet.');return}
  const json=JSON.stringify(changes,null,2);
  try{
    await navigator.clipboard.writeText(json);
    setStatus('Copied '+changes.length+' change'+(changes.length===1?'':'s')+'. Paste them in a message to me.');
    hideFallback();
  }catch(e){
    showFallback(json);
    setStatus('Clipboard is blocked. Copy the text below and send it to me.');
  }
}
function showFallback(json){
  const box=document.getElementById('edit-fallback');
  const ta=document.getElementById('edit-fallback-text');
  if(!box||!ta)return;
  ta.value=json;
  box.hidden=false;
  ta.focus();ta.select();
  layoutEditChrome();
}
function hideFallback(){
  const box=document.getElementById('edit-fallback');
  if(box)box.hidden=true;
  layoutEditChrome();
}
function clearAllChanges(){
  if(!collectChanges().length){setStatus('No changes to clear.');return}
  if(!confirm('Clear all segment edits saved on this device? The live site times will come back.'))return;
  try{localStorage.removeItem(EDIT_KEY)}catch(e){}
  location.reload();
}

function makePlayer(play){
  const video=$('video',{preload:'none',poster:play.poster,playsinline:'',muted:'',controls:'','aria-label':play.id+' '+play.title});
  video.muted=true;video.playsInline=true;
  video.append($('source',{src:play.video,type:'video/mp4'}));
  const now=$('div',{class:'now','aria-live':'polite'});
  const st={video,range:null,loop:false,rate:1,raf:0,btn:null,internal:false,now,play};
  players.push(st);

  const speeds=$('div',{class:'seg-group',role:'group','aria-label':'Speed'});
  for(const r of [1,.5,.25]){
    const b=$('button',{type:'button','aria-pressed':String(r===1),text:r===1?'1×':(r+'×').replace('0.','.'),onclick:()=>{st.rate=r;applyRate(st);for(const x of speeds.children)x.setAttribute('aria-pressed',String(x===b))}});
    speeds.append(b);
  }
  const loopBtn=$('button',{type:'button',class:'loop','aria-pressed':'false',text:'↻ Loop',onclick:()=>{st.loop=!st.loop;loopBtn.setAttribute('aria-pressed',String(st.loop))}});

  const dur=play.duration;
  const tl=$('div',{class:'timeline','aria-label':'Who has the ball when'});
  const head=$('div',{class:'playhead',style:'--p:0;left:calc(40px + (100% - 40px) * var(--p))'});
  st.tl=tl;st.head=head;

  const btnBox=$('div',{class:'buttons'});
  const segsWrap=$('div',{class:'seg-list'});
  const full=$('button',{type:'button',class:'rb','aria-pressed':'false',onclick:()=>start(st,0,dur,full,'Full play')},$('span',{class:'pos-chip','data-pos':'ALL',text:'▶'}),$('span',{text:'Full play'}),$('span',{class:'t',text:fmt(dur)}));
  const addBtn=$('button',{type:'button',class:'edit-add',text:'+ Add a position',onclick:()=>addSeg(st)});
  btnBox.append(full,segsWrap,addBtn);
  st.fullBtn=full;st.btns=[full];

  function sync(i){
    const s=play.segments[i];
    if(!s)return;
    if(s._bar){s._bar.setAttribute('style',barStyle(s,dur));s._bar.setAttribute('aria-label','Replay '+s.label);s._bar.title=s.label}
    if(s._tlPos)s._tlPos.textContent=s.pos;
    if(s._chip){s._chip.textContent=s.pos;s._chip.setAttribute('data-pos',s.pos)}
    if(s._labNode)s._labNode.nodeValue=s.label.replace(/^[^:]+:\s*/,'');
    if(s._time)s._time.textContent=s.start.toFixed(1)+'–'+s.end.toFixed(1)+'s';
    if(s._startVal)s._startVal.textContent=s.start.toFixed(1)+'s';
    if(s._endVal)s._endVal.textContent=s.end.toFixed(1)+'s';
    if(s._labelIn&&s._labelIn.value!==s.label)s._labelIn.value=s.label;
    if(s._posSel&&s._posSel.value!==s.pos)s._posSel.value=s.pos;
    if(s._block)s._block.classList.toggle('is-edited',rowEdited(play,i));
  }

  function applyTimes(i,nextStart,nextEnd){
    const s=play.segments[i];
    const d=durOf(st)||dur;
    let a=r1(nextStart),b=r1(nextEnd);
    if(a<0)a=0;
    if(d){if(b>r1(d))b=r1(d);if(a>r1(d))a=r1(d)}
    if(a>=b){
      if(s._err){s._err.textContent='Start must be before end';s._err.hidden=false}
      return false;
    }
    if(s._err){s._err.textContent='';s._err.hidden=true}
    s.start=a;s.end=b;
    sync(i);
    persistEdits();
    return true;
  }

  function resetSeg(i){
    const orig=ORIG[play.id]||[];
    if(i>=orig.length){removeSeg(i);return}
    const o=orig[i],s=play.segments[i];
    if(!s||!o)return;
    s.pos=o.pos;s.label=o.label;s.start=o.start;s.end=o.end;
    if(s._err){s._err.textContent='';s._err.hidden=true}
    sync(i);
    persistEdits();
  }

  function removeSeg(i){
    play.segments.splice(i,1);
    rebuild();
    persistEdits();
  }

  function addSeg(){
    const d=durOf(st)||dur||1;
    let start=r1(st.video.currentTime||0);
    if(start<0)start=0;
    if(start>r1(d))start=r1(d);
    let end=r1(Math.min(d,start+1));
    if(start>=end){start=Math.max(0,r1(end-1))}
    if(start>=end){setStatus('Could not add a position: no room in the clip.','err');return}
    play.segments.push({pos:'P',label:'P: field & throw',start,end});
    rebuild();
    persistEdits();
    const last=play.segments[play.segments.length-1];
    if(last&&last._labelIn)last._labelIn.focus();
  }

  function buildBlock(i){
    const s=play.segments[i];
    const lab=s.label.replace(/^[^:]+:\s*/,'');
    const chip=$('span',{class:'pos-chip','data-pos':s.pos,text:s.pos});
    const labNode=document.createTextNode(lab);
    const labEl=$('span');
    labEl.append(labNode);
    if(s.note&&/not shown/.test(s.note))labEl.append($('span',{class:'cam',text:s.note}));
    const timeEl=$('span',{class:'t',text:s.start.toFixed(1)+'–'+s.end.toFixed(1)+'s'});
    const btn=$('button',{type:'button',class:'rb','aria-pressed':'false',onclick:()=>start(st,s.start,s.end,btn,s.label,s._bar)},
      chip,labEl,$('span',{class:'edited-tag',text:'edited'}),timeEl);

    const err=$('p',{class:'edit-err',hidden:true});
    const startVal=$('span',{class:'edit-val',text:s.start.toFixed(1)+'s'});
    const endVal=$('span',{class:'edit-val',text:s.end.toFixed(1)+'s'});
    const labelIn=$('input',{type:'text',class:'edit-label',value:s.label,'aria-label':'Position label',maxlength:'80',autocomplete:'off'});
    const posSel=$('select',{class:'edit-pos','aria-label':'Position'});
    for(const p of POSITIONS){
      const o=document.createElement('option');
      o.value=p;o.textContent=p;if(p===s.pos)o.selected=true;
      posSel.append(o);
    }
    if(!POSITIONS.includes(s.pos)){
      const o=document.createElement('option');o.value=s.pos;o.textContent=s.pos;o.selected=true;posSel.append(o);
    }
    labelIn.addEventListener('input',()=>{s.label=labelIn.value;sync(i);persistEdits()});
    posSel.addEventListener('change',()=>{s.pos=posSel.value;sync(i);persistEdits()});
    const fromVideo=()=>{
      if((st.video.readyState||0)<1 && !(st.video.currentTime>0)){
        if(s._err){s._err.textContent='Play or scrub the video first';s._err.hidden=false}
        return null;
      }
      return r1(st.video.currentTime||0);
    };
    const setFromVideo=(which)=>{
      const t=fromVideo();
      if(t==null)return;
      if(which==='start')applyTimes(i,t,s.end);
      else applyTimes(i,s.start,t);
    };

    const editor=$('div',{class:'seg-edit'},
      $('div',{class:'edit-id'},posSel,labelIn),
      $('div',{class:'edit-bounds'},
        $('div',{class:'edit-bound'},
          $('div',{class:'edit-bound-h'},$('span',{text:'Start'}),startVal),
          $('div',{class:'edit-bound-btns'},
            $('button',{type:'button',onclick:()=>setFromVideo('start'),text:'Set start'}),
            $('button',{type:'button',class:'nudge','aria-label':'Start minus 0.1 seconds',onclick:()=>applyTimes(i,s.start-0.1,s.end),text:'−0.1'}),
            $('button',{type:'button',class:'nudge','aria-label':'Start plus 0.1 seconds',onclick:()=>applyTimes(i,s.start+0.1,s.end),text:'+0.1'})
          )
        ),
        $('div',{class:'edit-bound'},
          $('div',{class:'edit-bound-h'},$('span',{text:'End'}),endVal),
          $('div',{class:'edit-bound-btns'},
            $('button',{type:'button',onclick:()=>setFromVideo('end'),text:'Set end'}),
            $('button',{type:'button',class:'nudge','aria-label':'End minus 0.1 seconds',onclick:()=>applyTimes(i,s.start,s.end-0.1),text:'−0.1'}),
            $('button',{type:'button',class:'nudge','aria-label':'End plus 0.1 seconds',onclick:()=>applyTimes(i,s.start,s.end+0.1),text:'+0.1'})
          )
        )
      ),
      err,
      $('div',{class:'edit-actions'},
        $('button',{type:'button',class:'preview',onclick:()=>{if(s._err){s._err.textContent='';s._err.hidden=true}start(st,s.start,s.end,btn,s.label,s._bar)},text:'Preview'}),
        $('button',{type:'button',onclick:()=>resetSeg(i),text:'Reset'}),
        $('button',{type:'button',class:'edit-remove',onclick:()=>removeSeg(i),text:'Remove'})
      )
    );

    const block=$('div',{class:'seg-block'+(rowEdited(play,i)?' is-edited':'')},btn,editor);
    s._chip=chip;s._labNode=labNode;s._time=timeEl;s._block=block;
    s._startVal=startVal;s._endVal=endVal;s._labelIn=labelIn;s._posSel=posSel;s._err=err;
    block._btn=btn;
    return block;
  }

  function rebuild(){
    tl.textContent='';
    play.segments.forEach((s,i)=>{
      const bar=$('button',{type:'button',class:'tl-bar','aria-label':'Replay '+s.label,title:s.label,style:barStyle(s,dur),onclick:()=>st.btns[i+1]&&st.btns[i+1].click()});
      s._bar=bar;
      const posEl=$('b',{text:s.pos});
      s._tlPos=posEl;
      tl.append($('div',{class:'tl-row'},posEl,$('div',{class:'tl-track'},bar)));
    });
    tl.append(head);
    segsWrap.textContent='';
    const segBtns=[full];
    play.segments.forEach((s,i)=>{
      const block=buildBlock(i);
      segsWrap.append(block);
      segBtns.push(block._btn);
    });
    st.btns=segBtns;
  }

  st.rebuild=rebuild;
  rebuild();

  video.addEventListener('play',()=>{pauseOthers(video);loop(st)});
  video.addEventListener('seeking',()=>{if(!st.internal)clearRange(st)});
  video.addEventListener('seeked',()=>{st.internal=false;drawHead(st)});
  video.addEventListener('loadedmetadata',()=>applyRate(st));
  video.addEventListener('ended',()=>{if(st.loop&&st.range){seek(st,st.range[0]);video.play()}});

  const media=$('div',{class:'media'},$('div',{class:'stage'},video,now),$('div',{class:'tools'},speeds,loopBtn),tl);
  const side=$('div',{class:'side'},$('h4',{text:'REPLAY A POSITION'}),btnBox);
  return {media,side};
}

function render(data){
  const main=document.getElementById('plays');main.textContent='';
  const nav=document.getElementById('cat-nav');nav.textContent='';
  for(const c of data.categories){
    nav.append($('a',{href:'#'+c.id},$('span',{text:String(c.plays.length)}),document.createTextNode(c.name)));
    const sec=$('section',{class:'cat',id:c.id},$('h2',{},document.createTextNode(c.name),$('small',{text:c.plays.length+' PLAYS'})));
    if(c.intro.length)sec.append($('div',{class:'cat-intro'},$('b',{text:c.intro_label||'NOTE'}),...c.intro.map(t=>$('p',{text:t}))));
    for(const p of c.plays){
      const {media,side}=makePlayer(p);
      if(p.coach_notes.length)side.append($('h4',{text:"COACH CASSADY'S NOTES"}),$('ul',{class:'notes'},...p.coach_notes.map(n=>$('li',{text:n}))));
      if(p.situation)side.append($('p',{class:'players',text:'Situation: '+p.situation}));
      if(p.official_play)side.append($('p',{class:'players',text:'Official: '+p.official_play}));
      side.append($('p',{class:'players',text:'Players: '+p.players}));
      const kick=$('p',{class:'kicker'},document.createTextNode(p.id+' '),p.pfp_type?$('em',{class:'src-badge pfp',text:p.pfp_type.toUpperCase()}):null,p.source?$('em',{class:'src-badge',text:p.source.toUpperCase()}):null,$('span',{text:' · '+p.game+' · '+p.date}));
      sec.append($('article',{class:'play'+(p.source?' ps':''),id:p.id.toLowerCase()},
        $('div',{class:'play-head'},kick,$('h3',{text:p.title}),$('p',{class:'desc',text:p.description})),
        media,side));
    }
    main.append(sec);
  }
}
function route(){
  const h=decodeURIComponent(location.hash.slice(1)).toLowerCase();
  if(!h)return;
  let id=(DATA.legacy_hashes||{})[h]||h;
  const t=document.getElementById(id);
  if(t)t.scrollIntoView();
}
function wireEdit(){
  const tog=document.getElementById('edit-toggle');
  if(tog)tog.addEventListener('click',e=>{e.preventDefault();setEditing(!document.body.classList.contains('editing'))});
  const copy=document.getElementById('edit-copy');
  const copy2=document.getElementById('edit-dock-copy');
  const clear=document.getElementById('edit-clear');
  const hide=document.getElementById('edit-fallback-close');
  if(copy)copy.addEventListener('click',copyChanges);
  if(copy2)copy2.addEventListener('click',copyChanges);
  if(clear)clear.addEventListener('click',clearAllChanges);
  if(hide)hide.addEventListener('click',hideFallback);
  window.addEventListener('resize',layoutEditChrome);
}

wireEdit();
fetch('clips.json?v=1795616688',{cache:'no-store'}).then(r=>r.json()).then(data=>{
  snapshotOriginals(data);
  applyStoredEdits(data);
  DATA=data;render(data);
  setEditing(isEditFlag());
  window.addEventListener('hashchange',route);
  route();
}).catch(e=>{console.error(e);document.getElementById('plays').innerHTML='<p class="loading">Could not load the plays. Refresh to try again.</p>'});
})();
