(()=>{
const $=(t,a={},...kids)=>{const e=document.createElement(t);for(const[k,v]of Object.entries(a)){if(k==='class')e.className=v;else if(k==='text')e.textContent=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else e.setAttribute(k,v)}for(const c of kids)if(c!=null)e.append(c);return e};
const fmt=s=>s.toFixed(1)+'s';
const players=[];

function pauseOthers(v){for(const p of players)if(p.video!==v&&!p.video.paused)p.video.pause()}

function makePlayer(play){
  const video=$('video',{preload:'none',poster:play.poster,playsinline:'',muted:'',controls:'', 'aria-label':play.id+' '+play.title});
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

  // timeline
  const tl=$('div',{class:'timeline','aria-label':'Who has the ball when'});
  const dur=play.duration;
  play.segments.forEach((s,i)=>{
    const bar=$('button',{type:'button',class:'tl-bar','aria-label':'Replay '+s.label,title:s.label,style:`left:${s.start/dur*100}%;width:${(s.end-s.start)/dur*100}%;background:var(--${posVar(s.pos)})`,onclick:()=>segBtns[i+1].click()});
    s._bar=bar;
    tl.append($('div',{class:'tl-row'},$('b',{text:s.pos}),$('div',{class:'tl-track'},bar)));
  });
  const head=$('div',{class:'playhead',style:'--p:0;left:calc(40px + (100% - 40px) * var(--p))'});
  tl.append(head);st.head=head;

  // buttons
  const segBtns=[];
  const full=$('button',{type:'button',class:'rb','aria-pressed':'false',onclick:()=>start(st,0,dur,full,'Full play')},$('span',{class:'pos-chip','data-pos':'ALL',text:'▶'}),$('span',{text:'Full play'}),$('span',{class:'t',text:fmt(dur)}));
  segBtns.push(full);
  for(const s of play.segments){
    const lab=s.label.replace(/^[^:]+:\s*/,'');
    const b=$('button',{type:'button',class:'rb','aria-pressed':'false',onclick:()=>start(st,s.start,s.end,b,s.label,s._bar)},
      $('span',{class:'pos-chip','data-pos':s.pos,text:s.pos}),
      $('span',{},document.createTextNode(lab),s.note&&/not shown/.test(s.note)?$('span',{class:'cam',text:s.note}):null),
      $('span',{class:'t',text:s.start.toFixed(1)+'–'+s.end.toFixed(1)+'s'}));
    segBtns.push(b);
  }
  st.btns=segBtns;

  video.addEventListener('play',()=>{pauseOthers(video);loop(st)});
  video.addEventListener('seeking',()=>{if(!st.internal)clearRange(st)});
  video.addEventListener('seeked',()=>{st.internal=false;drawHead(st)});
  video.addEventListener('loadedmetadata',()=>applyRate(st));
  video.addEventListener('ended',()=>{if(st.loop&&st.range){seek(st,st.range[0]);video.play()}});

  const media=$('div',{class:'media'},$('div',{class:'stage'},video,now),$('div',{class:'tools'},speeds,loopBtn),tl);
  const side=$('div',{class:'side'},$('h4',{text:'REPLAY A POSITION'}),$('div',{class:'buttons'},...segBtns));
  return {media,side};
}
function posVar(p){return p}
function applyRate(st){st.video.defaultPlaybackRate=st.rate;st.video.playbackRate=st.rate}
function seek(st,t){st.internal=true;st.video.currentTime=t}
function clearRange(st){st.range=null;for(const b of st.btns)b.setAttribute('aria-pressed','false');for(const s of st.play.segments)s._bar.classList.remove('active');st.now.classList.remove('show')}
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

const partIntro={
 'part1':['Double plays, range plays, slow rollers, first-base plays, and relays & cutoffs.'],
 'part2':['Bunt defense, pickoffs & rundowns, tag plays at the bases, and infield-in with a runner on third.'],
 'postseason-2026':['Situational plays from the 2026 Wild Card, Division Series, LCS and World Series.','Coaching points here are drafts until Coach Cassady reviews them. One that the video contradicted has been corrected and is marked.']
};
let DATA=null,built={};
function renderPart(part){
  const main=document.getElementById('plays');
  if(built[part.id]){return built[part.id]}
  const wrap=$('div',{class:'part',id:'part-'+part.id});
  wrap.append($('div',{class:'part-head'},$('h2',{class:'part-title',text:part.title}),...(partIntro[part.id]||[]).map(t=>$('p',{text:t}))));
  for(const c of part.categories){
    const sec=$('section',{class:'cat',id:c.id},$('h2',{},document.createTextNode(c.name),$('small',{text:c.plays.length+' PLAYS'})));
    if(c.intro.length)sec.append($('div',{class:'cat-intro'},$('b',{text:part.id==='part2'?'COACH CASSADY':'NOTE'}),...c.intro.map(t=>$('p',{text:t}))));
    for(const p of c.plays){
      const {media,side}=makePlayer(p);
      const st=p.coaching_point_status;
      side.append($('h4',{},document.createTextNode('COACHING POINT'),st?$('span',{class:'badge '+st,text:st==='draft'?'DRAFT':'CORRECTED'}):null),$('p',{class:'point',text:p.coaching_point}));
      if(p.original_coaching_point)side.append($('details',{class:'orig'},$('summary',{text:'Why it was changed'}),$('p',{text:'The draft said: "'+p.original_coaching_point+'" The video shows standard coverage with no one at 3rd, not a wheel play.'})));
      if(p.coach_notes.length)side.append($('h4',{text:"COACH CASSADY'S NOTES"}),$('ul',{class:'notes'},...p.coach_notes.map(n=>$('li',{text:n}))));
      if(p.situation)side.append($('p',{class:'players',text:'Situation: '+p.situation}));
      if(p.official_play)side.append($('p',{class:'players',text:'Official: '+p.official_play}));
      side.append($('p',{class:'players',text:'Players: '+p.players}));
      sec.append($('article',{class:'play',id:p.id.toLowerCase()},
        $('div',{class:'play-head'},$('p',{class:'kicker'},document.createTextNode(p.id+' '),$('span',{text:'· '+p.game+' · '+p.date})),$('h3',{text:p.title}),$('p',{class:'desc',text:p.description})),
        media,side));
    }
    wrap.append(sec);
  }
  main.append(wrap);built[part.id]=wrap;return wrap;
}
function showPart(id,scrollTarget){
  const part=DATA.parts.find(p=>p.id===id)||DATA.parts[0];
  for(const p of DATA.parts){const w=built[p.id];if(w)w.hidden=p.id!==part.id}
  renderPart(part).hidden=false;
  for(const p of players)if(!p.video.paused)p.video.pause();
  for(const a of document.querySelectorAll('.part-tabs a'))a.setAttribute('aria-current',a.dataset.part===part.id?'page':'false');
  const nav=document.getElementById('cat-nav');nav.textContent='';
  for(const c of part.categories)nav.append($('a',{href:'#'+c.id},$('span',{text:String(c.plays.length)}),document.createTextNode(c.name)));
  document.querySelector('.top-meta').textContent='CLIP LIBRARY · '+part.name.toUpperCase();
  if(scrollTarget){const t=document.getElementById(scrollTarget);if(t)t.scrollIntoView()}
}
function route(){
  const h=decodeURIComponent(location.hash.slice(1));
  if(!h){showPart(DATA.parts[0].id);return}
  const lc=h.toLowerCase();
  for(const p of DATA.parts){
    if(p.id===lc){showPart(p.id);document.getElementById('top').scrollIntoView();return}
    for(const c of p.categories){
      if(c.id===lc){showPart(p.id,c.id);return}
      if(c.plays.some(x=>x.id.toLowerCase()===lc)){showPart(p.id,lc);return}
    }
  }
  if(lc==='top'){return}
  showPart(DATA.parts[0].id);
}
fetch('clips.json').then(r=>r.json()).then(data=>{
  DATA=data;
  const main=document.getElementById('plays');main.textContent='';
  const tabs=document.getElementById('part-tabs');
  for(const p of data.parts){const n=p.categories.reduce((a,c)=>a+c.plays.length,0);tabs.append($('a',{href:'#'+p.id,'data-part':p.id},document.createTextNode(p.name),$('span',{text:n+' plays'})))}
  window.addEventListener('hashchange',route);
  route();
}).catch(e=>{console.error(e);document.getElementById('plays').innerHTML='<p class="loading">Could not load the plays. Refresh to try again.</p>'});
})();
