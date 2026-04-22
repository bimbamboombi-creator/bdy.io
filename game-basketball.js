// ============================================================
// game-basketball.js  —  Basketball shooting game
// Win: score 3 goals in 6 attempts → poem reward
// ============================================================

// ===== BASKETBALL GAME =====
(function() {
  const canvas  = document.getElementById('bball-canvas');
  const ctx     = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  // ---- State ----
  let score = 0, attempts = 0, goals = 0;
  let ball = null, dragging = false, dragStart = null, dragCurrent = null;
  let ballInFlight = false;
  let particles = [];
  let confetti  = [];
  let rimBounce = { left: 0, right: 0 };
  let netWiggle  = 0;
  let trailPts  = [];
  let won = false;
  let frameId;

  // ---- Hoop ----
  const HOOP = {
    x: W * 0.62,
    y: H * 0.28,
    rimR: 48,
    rimW: 7,
    boardW: 12,
    boardH: 80,
    poleH: H * 0.72
  };

  // ---- Ball start ----
  const BALL_START = { x: W * 0.18, y: H * 0.72 };
  const BALL_R = 22;
  const GRAVITY = 0.55;
  let bx, by, vx, vy;

  function resetBallPos() {
    bx = BALL_START.x; by = BALL_START.y;
    vx = 0; vy = 0; ballInFlight = false;
    trailPts = [];
  }
  resetBallPos();

  // ---- Draw helpers ----
  function drawCourt() {
    // Floor
    const floorY = H * 0.88;
    ctx.fillStyle = '#120008';
    ctx.fillRect(0, floorY, W, H - floorY);

    // Floor line
    ctx.strokeStyle = 'rgba(201,168,76,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, floorY); ctx.lineTo(W, floorY); ctx.stroke();

    // 3-point arc on floor (decorative)
    ctx.beginPath();
    ctx.arc(W * 0.62, floorY, 260, Math.PI, 2*Math.PI);
    ctx.strokeStyle = 'rgba(201,168,76,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Lane box
    ctx.strokeStyle = 'rgba(201,168,76,0.1)';
    ctx.strokeRect(W*0.38, floorY - H*0.35, W*0.48, H*0.35);
  }

  function drawBackboard() {
    const bx = HOOP.x + HOOP.rimR + 6;
    const by = HOOP.y - 40;
    // Board
    ctx.fillStyle = 'rgba(20,0,8,0.9)';
    ctx.fillRect(bx, by, HOOP.boardW, HOOP.boardH);
    ctx.strokeStyle = 'rgba(201,168,76,0.6)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, HOOP.boardW, HOOP.boardH);
    // Inner box
    ctx.strokeStyle = 'rgba(201,168,76,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx+2, by+24, HOOP.boardW-4, 32);
    // Pole
    const grd = ctx.createLinearGradient(bx+HOOP.boardW, by, bx+HOOP.boardW+3, by);
    grd.addColorStop(0,'rgba(201,168,76,0.8)');
    grd.addColorStop(1,'rgba(100,50,0,0.5)');
    ctx.fillStyle = grd;
    ctx.fillRect(bx+HOOP.boardW, by+HOOP.boardH, 4, HOOP.poleH);
  }

  function drawRim() {
    const lx = HOOP.x - HOOP.rimR;
    const rx = HOOP.x + HOOP.rimR;
    const y  = HOOP.y + (rimBounce.left + rimBounce.right) * 0.3;

    ctx.lineWidth = HOOP.rimW;
    ctx.strokeStyle = '#cc4400';
    ctx.lineCap = 'round';

    // Left rim
    ctx.beginPath();
    ctx.moveTo(lx - 4, y + rimBounce.left);
    ctx.lineTo(lx + 8, y + rimBounce.left);
    ctx.stroke();

    // Right rim
    ctx.beginPath();
    ctx.moveTo(rx - 8, y + rimBounce.right);
    ctx.lineTo(rx + 4, y + rimBounce.right);
    ctx.stroke();

    // Top glow
    ctx.strokeStyle = 'rgba(255,120,40,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx-4, y+rimBounce.left-2);
    ctx.lineTo(rx+4, y+rimBounce.right-2);
    ctx.stroke();
  }

  function drawNet() {
    const lx = HOOP.x - HOOP.rimR + 4;
    const rx = HOOP.x + HOOP.rimR - 4;
    const topY = HOOP.y;
    const netH = 50;
    const segs = 7;
    const wiggle = netWiggle;

    ctx.strokeStyle = 'rgba(245,230,200,0.55)';
    ctx.lineWidth = 1;
    // Vertical strands
    for (let i=0; i<=segs; i++) {
      const t = i/segs;
      const nx = lx + (rx-lx)*t;
      const swayX = Math.sin((t*Math.PI) + wiggle*0.8) * wiggle * 3;
      ctx.beginPath();
      ctx.moveTo(nx, topY);
      ctx.quadraticCurveTo(nx + swayX, topY + netH*0.5, nx + swayX*0.5, topY + netH);
      ctx.stroke();
    }
    // Horizontal links
    for (let row=1; row<=3; row++) {
      const progress = row / 4;
      const y2 = topY + netH * progress;
      ctx.beginPath();
      for (let i=0; i<=segs; i++) {
        const t = i/segs;
        const nx = lx + (rx-lx)*t;
        const swayX = Math.sin((t*Math.PI) + wiggle*0.8) * wiggle * 3;
        const px = nx + swayX*progress;
        if (i===0) ctx.moveTo(px, y2);
        else ctx.lineTo(px, y2);
      }
      ctx.stroke();
    }
  }

  function drawBall(x, y) {
    // Shadow on floor
    const floorY = H * 0.88;
    const shadowAlpha = 0.25 * Math.min(1, (floorY - y) / 300);
    if (shadowAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = shadowAlpha;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(x, floorY - 2, BALL_R * 0.9, 6, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    // Ball gradient
    const grd = ctx.createRadialGradient(x-6, y-6, 2, x, y, BALL_R);
    grd.addColorStop(0,'#ff8c42');
    grd.addColorStop(0.5,'#cc4400');
    grd.addColorStop(1,'#7a1a00');
    ctx.beginPath();
    ctx.arc(x, y, BALL_R, 0, Math.PI*2);
    ctx.fillStyle = grd;
    ctx.fill();

    // Lines
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, BALL_R, 0, Math.PI*2);
    ctx.stroke();
    // Horizontal seam
    ctx.beginPath();
    ctx.ellipse(x, y, BALL_R, BALL_R*0.35, 0, 0, Math.PI*2);
    ctx.stroke();
    // Vertical seam
    ctx.beginPath();
    ctx.ellipse(x, y, BALL_R*0.35, BALL_R, 0, 0, Math.PI*2);
    ctx.stroke();

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.ellipse(x-8, y-8, 8, 5, -Math.PI/4, 0, Math.PI*2);
    ctx.fill();
  }

  function drawTrail() {
    if (trailPts.length < 2) return;
    for (let i=1; i<trailPts.length; i++) {
      const alpha = (i/trailPts.length) * 0.4;
      const r = BALL_R * (i/trailPts.length) * 0.6;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#ff6600';
      ctx.beginPath();
      ctx.arc(trailPts[i].x, trailPts[i].y, r, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawAimGuide() {
    if (!dragging || ballInFlight) return;
    const dx = dragStart.x - dragCurrent.x;
    const dy = dragStart.y - dragCurrent.y;
    const power = Math.min(Math.sqrt(dx*dx+dy*dy), 220);
    const angle = Math.atan2(dy, dx);
    const svx = Math.cos(angle) * power * 0.14;
    const svy = Math.sin(angle) * power * 0.14;

    // Dotted trajectory preview
    ctx.setLineDash([5,8]);
    ctx.strokeStyle = 'rgba(255,215,0,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let px=bx, py=by, pvx=svx, pvy=svy;
    ctx.moveTo(px,py);
    for (let i=0; i<35; i++) {
      pvx *= 0.995; pvy += GRAVITY;
      px += pvx; py += pvy;
      if (py > H) break;
      ctx.lineTo(px,py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Power arc indicator
    const pct = power/220;
    const col = pct < 0.4 ? 'rgba(201,168,76,0.7)' :
                pct < 0.7 ? 'rgba(255,165,0,0.8)' :
                            'rgba(220,50,50,0.8)';
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx, by, BALL_R + 10, angle - 0.3, angle + 0.3);
    ctx.stroke();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.shape==='star') {
        drawStar(ctx, 0,0, 4, p.r, p.r*0.4);
      } else {
        ctx.beginPath(); ctx.arc(0,0,p.r,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawStar(c, x,y,pts,outer,inner) {
    c.beginPath();
    for(let i=0;i<pts*2;i++){
      const r=i%2===0?outer:inner;
      const a=(i*Math.PI/pts)-(Math.PI/2);
      i===0?c.moveTo(x+r*Math.cos(a),y+r*Math.sin(a)):c.lineTo(x+r*Math.cos(a),y+r*Math.sin(a));
    }
    c.closePath(); c.fill();
  }

  function spawnGoalParticles(x,y) {
    const cols=['#ffd700','#ff1a1a','#f0d080','#cc0000','#ffffff','#ff6600'];
    for(let i=0;i<60;i++){
      const angle=Math.random()*Math.PI*2;
      const spd=Math.random()*6+2;
      particles.push({
        x,y,
        vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd-3,
        r:Math.random()*5+2,
        color:cols[Math.floor(Math.random()*cols.length)],
        life:1, decay:Math.random()*0.025+0.015,
        rot:Math.random()*Math.PI*2, rotV:(Math.random()-0.5)*0.25,
        shape:Math.random()>0.5?'star':'circle',
        gravity:0.15
      });
    }
  }

  // ---- Physics loop ----
  function update() {
    if (ballInFlight) {
      vx *= 0.998; vy += GRAVITY;
      bx += vx; by += vy;

      // Trail
      trailPts.push({x:bx,y:by});
      if (trailPts.length > 18) trailPts.shift();

      // Floor bounce
      const floorY = H * 0.88;
      if (by + BALL_R >= floorY) {
        by = floorY - BALL_R;
        vy *= -0.42; vx *= 0.75;
        if (Math.abs(vy) < 1.5) { vy = 0; vx *= 0.8; }
        if (Math.abs(vy) < 0.5 && Math.abs(vx) < 0.3) {
          ballInFlight = false; trailPts = [];
        }
      }

      // Wall
      if (bx - BALL_R < 0) { bx=BALL_R; vx=Math.abs(vx)*0.6; }
      if (bx + BALL_R > W) { bx=W-BALL_R; vx=-Math.abs(vx)*0.6; }

      // Rim collision
      const lrimX = HOOP.x - HOOP.rimR;
      const rrimX = HOOP.x + HOOP.rimR;
      const rimY  = HOOP.y;
      const rimTol = BALL_R + 5;

      const dLeft  = Math.hypot(bx-lrimX, by-rimY);
      const dRight = Math.hypot(bx-rrimX, by-rimY);

      if (dLeft < rimTol) {
        const ang=Math.atan2(by-rimY,bx-lrimX);
        bx=lrimX+Math.cos(ang)*rimTol; by=rimY+Math.sin(ang)*rimTol;
        const dot=vx*Math.cos(ang)+vy*Math.sin(ang);
        vx-=2*dot*Math.cos(ang)*0.65; vy-=2*dot*Math.sin(ang)*0.65;
        rimBounce.left = 4; vx*=0.85; vy*=0.85;
      }
      if (dRight < rimTol) {
        const ang=Math.atan2(by-rimY,bx-rrimX);
        bx=rrimX+Math.cos(ang)*rimTol; by=rimY+Math.sin(ang)*rimTol;
        const dot=vx*Math.cos(ang)+vy*Math.sin(ang);
        vx-=2*dot*Math.cos(ang)*0.65; vy-=2*dot*Math.sin(ang)*0.65;
        rimBounce.right = 4; vx*=0.85; vy*=0.85;
      }

      // Backboard collision
      const boardX = HOOP.x + HOOP.rimR + 6;
      if (bx + BALL_R > boardX && bx - BALL_R < boardX + HOOP.boardW &&
          by > HOOP.y - 40 && by < HOOP.y + HOOP.boardH - 40) {
        vx = -Math.abs(vx) * 0.6;
        bx = boardX - BALL_R;
      }

      // --- SCORE CHECK ---
      // Ball center passes through hoop horizontally while between rims
      const netCenterX = HOOP.x;
      const netTopY    = HOOP.y + 4;
      const netBotY    = HOOP.y + 50;
      const inHoopX    = bx > lrimX + BALL_R*0.6 && bx < rrimX - BALL_R*0.6;
      if (inHoopX && by > netTopY && by < netBotY && vy > 0 && !ball?._scored) {
        ball = ball || {}; ball._scored = true;
        goals++;
        score += 2;
        netWiggle = 10;
        spawnGoalParticles(HOOP.x, HOOP.y + 25);
        updateScoreUI();
        updatePips();
        if (goals >= 3) {
          // WON: 3 goals within attempt limit
          setTimeout(() => showResult('win'), 800);
        } else if (attempts >= 6) {
          // FAILED: used all attempts without 3 goals
          setTimeout(() => showResult('lose'), 800);
        }
      }
    }

    // Decay rim bounce
    rimBounce.left  *= 0.75;
    rimBounce.right *= 0.75;
    netWiggle *= 0.88;

    // Update particles
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.vy += p.gravity || 0.1;
      p.vx *= 0.97; p.rot += p.rotV;
      p.life -= p.decay;
    });
    particles = particles.filter(p => p.life > 0);
  }

  // ---- Render ----
  function render() {
    ctx.clearRect(0, 0, W, H);

    // Background gradient
    const bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#0a0002');
    bg.addColorStop(0.7,'#0d0008');
    bg.addColorStop(1,'#120010');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Ambient light under hoop
    const glow = ctx.createRadialGradient(HOOP.x, HOOP.y, 20, HOOP.x, HOOP.y, 180);
    glow.addColorStop(0,'rgba(201,168,76,0.07)');
    glow.addColorStop(1,'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0,0,W,H);

    drawCourt();
    drawBackboard();
    drawNet();
    drawRim();
    drawTrail();
    if (!ballInFlight) drawAimGuide();
    drawBall(bx, by);
    drawParticles();

    // Drag line
    if (dragging && !ballInFlight) {
      ctx.strokeStyle = 'rgba(201,168,76,0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4,6]);
      ctx.beginPath();
      ctx.moveTo(dragStart.x, dragStart.y);
      ctx.lineTo(dragCurrent.x, dragCurrent.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    update();
    frameId = requestAnimationFrame(render);
  }

  // ---- Show Result ----
  function showResult(type) {
    const overlay = document.getElementById('win-overlay');
    const winState  = document.getElementById('win-state');
    const loseState = document.getElementById('lose-state');
    const loseMsg   = document.getElementById('lose-message');
    overlay.classList.add('show');
    won = true;
    ballInFlight = false;
    if (type === 'win') {
      winState.classList.add('active');
      loseState.classList.remove('active');
    } else {
      loseState.classList.add('active');
      winState.classList.remove('active');
      loseMsg.textContent = `You scored ${goals} of 3 goals in 6 attempts. So close!`;
    }
  }

  // ---- UI ----
  function updateScoreUI() {
    const sd = document.getElementById('score-display');
    const ad = document.getElementById('attempts-display');
    sd.textContent = goals;
    ad.innerHTML = attempts + '<span style="font-size:0.5em;opacity:0.5">/6</span>';
    // Flash score on goal
    sd.classList.remove('scored');
    void sd.offsetWidth;
    sd.classList.add('scored');
    // Turn attempts red when only 1 left
    if (attempts >= 5 && goals < 3) {
      ad.style.color = 'var(--bright-red)';
      ad.style.textShadow = '0 0 20px rgba(255,26,26,0.6)';
    } else {
      ad.style.color = '';
      ad.style.textShadow = '';
    }
  }

  function updatePips() {
    for (let i=0; i<3; i++) {
      const pip = document.getElementById('pip-' + i);
      pip.classList.toggle('filled', i < goals);
    }
  }

  // ---- Input ----
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const src = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top)  * scaleY
    };
  }

  canvas.addEventListener('mousedown',  e => { if(!ballInFlight && !won && attempts<6){dragging=true;dragStart=getPos(e);dragCurrent={...dragStart};} });
  canvas.addEventListener('mousemove',  e => { if(dragging){dragCurrent=getPos(e);} });
  canvas.addEventListener('mouseup',    e => { if(dragging){shoot(getPos(e));} });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); if(!ballInFlight&&!won&&attempts<6){dragging=true;dragStart=getPos(e);dragCurrent={...dragStart};} }, {passive:false});
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); if(dragging){dragCurrent=getPos(e);} }, {passive:false});
  canvas.addEventListener('touchend',   e => { e.preventDefault(); if(dragging){shoot(dragCurrent);} }, {passive:false});

  function shoot(releasePos) {
    if (!dragging) return;
    dragging = false;
    const dx = dragStart.x - releasePos.x;
    const dy = dragStart.y - releasePos.y;
    const power = Math.min(Math.sqrt(dx*dx+dy*dy), 220);
    if (power < 8) return;
    const angle = Math.atan2(dy, dx);
    vx = Math.cos(angle) * power * 0.14;
    vy = Math.sin(angle) * power * 0.14;
    ball = {}; // reset scored flag
    ballInFlight = true;
    attempts++;
    updateScoreUI();
    // After 6th attempt, if not already won, trigger lose after ball settles
    if (attempts >= 6 && goals < 3) {
      setTimeout(() => {
        if (!won) showResult('lose');
      }, 3500);
    }
  }

  // ---- Reset ----
  window.resetBball = function() {
    score=0; attempts=0; goals=0; won=false;
    resetBallPos();
    particles=[]; confetti=[];
    rimBounce={left:0,right:0}; netWiggle=0;
    updateScoreUI(); updatePips();
    const overlay = document.getElementById('win-overlay');
    overlay.classList.remove('show');
    document.getElementById('win-state').classList.remove('active');
    document.getElementById('lose-state').classList.remove('active');
  };

  render();
})();