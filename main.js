// ============================================================
// main.js  —  Home + Cars scroll sections, cursor, shared utils
// Depends on: frames-data.js
// ============================================================

function makeCtx(id){const c=document.getElementById(id);return{canvas:c,ctx:c.getContext('2d')};}
const home=makeCtx('canvas-home');
const cars=makeCtx('canvas-cars');
const pCanvas=document.getElementById('particle-canvas');
const pCtx=pCanvas.getContext('2d');
function resize(){[home.canvas,cars.canvas,pCanvas].forEach(c=>{c.width=window.innerWidth;c.height=window.innerHeight;});}
resize();window.addEventListener('resize',resize);
const homeImgs=frames.map(src=>{const i=new Image();i.src=src;return i;});
const carsImgs=bmwFrames.map(src=>{const i=new Image();i.src=src;return i;});
function lerp(a,b,t){return a+(b-a)*t;}
function drawBlend(ctx,canvas,arr,lp){
  const target=lp*(arr.length-1);
  const f1=Math.floor(target),f2=Math.min(f1+1,arr.length-1),t=target-f1;
  const img1=arr[f1];
  if(!img1.complete||!img1.naturalWidth)return;
  const cw=canvas.width,ch=canvas.height,iw=img1.naturalWidth,ih=img1.naturalHeight;
  const s=Math.max(cw/iw,ch/ih),sw=iw*s,sh=ih*s,ox=(cw-sw)/2,oy=(ch-sh)/2;
  ctx.clearRect(0,0,cw,ch);ctx.globalAlpha=1-t;ctx.drawImage(img1,ox,oy,sw,sh);
  const img2=arr[f2];
  if(t>0.01&&img2.complete&&img2.naturalWidth){ctx.globalAlpha=t;ctx.drawImage(img2,ox,oy,sw,sh);}
  ctx.globalAlpha=1;
}
let particles=[];
const PCOLS=['#ffd700','#ff1a1a','#f0d080','#cc0000','#c9a84c'];
function spawnP(){particles.push({x:Math.random()*pCanvas.width,y:pCanvas.height+10,r:Math.random()*4+1,color:PCOLS[Math.floor(Math.random()*PCOLS.length)],vy:Math.random()*2.5+0.8,vx:(Math.random()-0.5)*1.8,life:1,decay:Math.random()*0.006+0.003,rot:Math.random()*360,rotV:(Math.random()-0.5)*4,shape:Math.random()>0.5?'diamond':'circle'});}
function animP(){pCtx.clearRect(0,0,pCanvas.width,pCanvas.height);particles=particles.filter(p=>p.life>0);for(const p of particles){p.y-=p.vy;p.x+=p.vx;p.life-=p.decay;p.rot+=p.rotV;pCtx.save();pCtx.globalAlpha=p.life;pCtx.fillStyle=p.color;pCtx.translate(p.x,p.y);pCtx.rotate(p.rot*Math.PI/180);if(p.shape==='diamond'){pCtx.beginPath();pCtx.moveTo(0,-p.r*2);pCtx.lineTo(p.r,0);pCtx.lineTo(0,p.r*2);pCtx.lineTo(-p.r,0);pCtx.closePath();pCtx.fill();}else{pCtx.beginPath();pCtx.arc(0,0,p.r,0,Math.PI*2);pCtx.fill();}if(p.r>2.5){pCtx.globalAlpha=p.life*0.4;pCtx.strokeStyle=p.color;pCtx.lineWidth=0.6;pCtx.beginPath();pCtx.moveTo(-p.r*3,0);pCtx.lineTo(p.r*3,0);pCtx.moveTo(0,-p.r*3);pCtx.lineTo(0,p.r*3);pCtx.stroke();}pCtx.restore();}requestAnimationFrame(animP);}
animP();let ptimer=null;
const progressBar=document.getElementById('progress-bar');
const scrollHint=document.getElementById('scroll-hint');
const ovH=document.getElementById('overlay-home');
const ovC=document.getElementById('overlay-cars');
const wishLetters=document.querySelectorAll('.wl');
const hScenes=[document.getElementById('s1'),document.getElementById('s2'),document.getElementById('s3'),document.getElementById('s4')];
const cScenes=[document.getElementById('c1'),document.getElementById('c2'),document.getElementById('c3'),document.getElementById('c4')];
const hCorners=['h-tl','h-tr','h-bl','h-br'].map(id=>document.getElementById(id));
const cCorners=['c-tl','c-tr','c-bl','c-br'].map(id=>document.getElementById(id));
const hOv=['rgba(60,0,0,0.18)','rgba(100,0,0,0.28)','rgba(40,15,0,0.22)','rgba(10,0,0,0.40)'];
const cOv=['rgba(0,0,0,0.30)','rgba(0,5,20,0.35)','rgba(10,0,0,0.30)','rgba(0,0,0,0.42)'];
let prevH=-1,prevC=-1,danceT=null;
function activate(arr,idx,prev){arr.forEach((s,i)=>{if(i===idx){s.classList.remove('exit');setTimeout(()=>s.classList.add('active'),20);}else if(i===prev){s.classList.remove('active');s.classList.add('exit');setTimeout(()=>s.classList.remove('exit'),550);}else{s.classList.remove('active','exit');}});}
function hideAll(arr){arr.forEach(s=>s.classList.remove('active','exit'));}
function secProg(el){const top=el.getBoundingClientRect().top;return Math.min(Math.max(-top/(el.offsetHeight-window.innerHeight),0),1);}
function onScroll(){
  const totalH=document.body.offsetHeight-window.innerHeight;
  progressBar.style.width=(Math.min(Math.max(window.scrollY/totalH,0),1)*100)+'%';
  if(window.scrollY>80)scrollHint.classList.add('gone');else scrollHint.classList.remove('gone');
  const homeEl=document.getElementById('section-home');
  const carsEl=document.getElementById('section-cars');
  const hRect=homeEl.getBoundingClientRect();
  const cRect=carsEl.getBoundingClientRect();
  // HOME
  if(hRect.top<=0&&hRect.bottom>=window.innerHeight){
    const lp=secProg(homeEl);
    drawBlend(home.ctx,home.canvas,homeImgs,lp);
    const active=Math.min(Math.floor(lp*4),3);
    ovH.style.background=hOv[active];
    if(active!==prevH){
      activate(hScenes,active,prevH);
      hCorners.forEach(c=>c.classList.add('show'));
      if(active===2){clearTimeout(danceT);wishLetters.forEach(l=>l.classList.remove('dancing'));danceT=setTimeout(()=>wishLetters.forEach(l=>l.classList.add('dancing')),900);if(!ptimer)ptimer=setInterval(()=>{for(let i=0;i<4;i++)spawnP();},90);}
      else{if(ptimer){clearInterval(ptimer);ptimer=null;}wishLetters.forEach(l=>l.classList.remove('dancing'));}
      prevH=active;
    }
  }else if(hRect.bottom<window.innerHeight){drawBlend(home.ctx,home.canvas,homeImgs,1);hideAll(hScenes);}
  // CARS
  if(cRect.top<=0&&cRect.bottom>=window.innerHeight){
    const lp=secProg(carsEl);
    drawBlend(cars.ctx,cars.canvas,carsImgs,lp);
    const active=Math.min(Math.floor(lp*4),3);
    ovC.style.background=cOv[active];
    if(active!==prevC){activate(cScenes,active,prevC);cCorners.forEach(c=>c.classList.add('show'));prevC=active;}
  }else if(cRect.top>0){drawBlend(cars.ctx,cars.canvas,carsImgs,0);hideAll(cScenes);}
}
window.addEventListener('scroll',onScroll,{passive:true});
const cursor=document.getElementById('cursor');
const cursorDot=document.getElementById('cursorDot');
let mx=0,my=0,cx2=0,cy2=0;
document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cursorDot.style.left=mx+'px';cursorDot.style.top=my+'px';});
(function ac(){cx2=lerp(cx2,mx,0.14);cy2=lerp(cy2,my,0.14);cursor.style.left=cx2+'px';cursor.style.top=cy2+'px';requestAnimationFrame(ac);})();
drawBlend(home.ctx,home.canvas,homeImgs,0);
drawBlend(cars.ctx,cars.canvas,carsImgs,0);
onScroll();