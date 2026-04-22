// ============================================================
// game-angry.js  —  Angry Birds
// Win: destroy 10 buildings with 5 birds → poem + praise
// ============================================================

// ===== ANGRY BIRDS GAME =====
(function () {
  const CV = document.getElementById('angry-canvas');
  const c2d = CV.getContext('2d');   // named c2d to avoid any clash
  const W = CV.width, H = CV.height;

  const GROUND_Y    = H - 55;
  const SLING_X     = 110;
  const SLING_Y     = GROUND_Y - 72;
  const BIRD_R      = 16;
  const MAX_PULL    = 85;
  const GRAV        = 0.48;
  const TOTAL_BIRDS = 5;
  const WIN_BLDGS   = 10;

  /* ── state ── */
  let birds, proj, bldgArr, debrisParts, score, bldgsDown, birdsUsed;
  let dragging, dragX, dragY;
  let gState;   // 'start'|'ready'|'flying'|'settling'|'done'
  let settleT = 0, frameN = 0;

  /* ── buildings ── */
  function genBuildings() {
    bldgArr = [];
    const bwArr  = [38,32,42,36,40,34,38,36,42,32,38,34];
    const bhArr  = [90,130,100,115,80,140,95,120,85,110,130,90];
    let wx = 265;
    for (let i = 0; i < 12; i++) {
      const bw = bwArr[i % bwArr.length];
      const bh = bhArr[i % bhArr.length];
      bldgArr.push({
        x: wx, y: GROUND_Y - bh, w: bw, h: bh,
        hp: 3, maxHp: 3, alive: true,
        shake: 0, sdx: 0
      });
      wx += bw + 52 + (i % 3 === 2 ? 30 : 0);
    }
  }

  function buildPips() {
    birds = Array.from({length: TOTAL_BIRDS}, () => ({used: false}));
    refreshPips();
  }

  function refreshPips() {
    const row = document.getElementById('ab-bird-pips');
    row.innerHTML = '';
    birds.forEach((b, i) => {
      const d = document.createElement('div');
      d.className = 'ab-bird-pip' + (b.used ? ' used' : '');
      row.appendChild(d);
    });
  }

  function init() {
    genBuildings();
    buildPips();
    debrisParts = [];
    score = 0; bldgsDown = 0; birdsUsed = 0;
    dragging = false;
    dragX = SLING_X; dragY = SLING_Y;
    gState = 'start'; proj = null; frameN = 0;
    document.getElementById('ab-score').textContent = '0';
    document.getElementById('ab-bldgs').textContent = '0 / 10';
    document.getElementById('angry-result').classList.remove('show');
    document.getElementById('ab-win-state').classList.remove('active');
    document.getElementById('ab-lose-state').classList.remove('active');
    document.getElementById('angry-start').classList.remove('hide');
  }

  /* ── launch ── */
  function launch(px, py) {
    if (birdsUsed >= TOTAL_BIRDS) return;
    const dx = SLING_X - px;
    const dy = SLING_Y - py;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d < 5) return;
    const pull  = Math.min(d, MAX_PULL);
    const angle = Math.atan2(dy, dx);
    const power = pull * 0.175;
    proj = {
      x: SLING_X, y: SLING_Y,
      vx: Math.cos(angle) * power,
      vy: Math.sin(angle) * power,
      trail: [], bounced: 0, scored: false
    };
    birds[birdsUsed].used = true;
    birdsUsed++;
    refreshPips();
    gState = 'flying';
    dragging = false;
  }

  /* ── physics ── */
  function stepProj() {
    const p = proj;
    if (!p) return;

    p.vy += GRAV;
    p.vx *= 0.999;
    p.x  += p.vx;
    p.y  += p.vy;

    // Trail
    p.trail.push({x: p.x, y: p.y, life: 1});
    if (p.trail.length > 20) p.trail.shift();
    p.trail.forEach(t => t.life -= 0.065);
    p.trail = p.trail.filter(t => t.life > 0);

    // Ground
    if (p.y + BIRD_R >= GROUND_Y) {
      p.y = GROUND_Y - BIRD_R;
      p.vy = -Math.abs(p.vy) * 0.38;
      p.vx *= 0.68;
      p.bounced++;
      if (p.bounced >= 3 || Math.abs(p.vy) < 1.2) {
        settle(); return;
      }
    }

    // Off screen
    if (p.x > W + 60 || p.x < -60) { settle(); return; }

    // Building collisions
    let hit = false;
    for (const b of bldgArr) {
      if (!b.alive) continue;
      const bsx = b.x + b.sdx;
      if (p.x + BIRD_R > bsx && p.x - BIRD_R < bsx + b.w &&
          p.y + BIRD_R > b.y  && p.y - BIRD_R < b.y  + b.h) {
        b.hp--;
        b.shake = 9;
        score += b.hp <= 0 ? 250 : 50;
        spawnDebris(bsx + b.w / 2, b.y + b.h / 2, b.hp <= 0 ? 20 : 9);
        if (b.hp <= 0) {
          b.alive = false;
          bldgsDown++;
          document.getElementById('ab-bldgs').textContent = bldgsDown + ' / 10';
          if (bldgsDown >= WIN_BLDGS) {
            gState = 'done';
            setTimeout(() => showResult('win'), 700);
            return;
          }
        }
        updateScoreEl();
        // Deflect bird
        const overlapX = (p.vx > 0) ? (bsx - p.x - BIRD_R) : (bsx + b.w - p.x + BIRD_R);
        const overlapY = (p.vy > 0) ? (b.y  - p.y - BIRD_R) : (b.y + b.h - p.y + BIRD_R);
        if (Math.abs(overlapX) < Math.abs(overlapY)) {
          p.vx = -p.vx * 0.45;
          p.x  += p.vx * 2;
        } else {
          p.vy = -Math.abs(p.vy) * 0.45;
          p.y  += p.vy;
        }
        hit = true;
        break;
      }
    }
  }

  function settle() {
    gState = 'settling';
    settleT = 55;
  }

  function onSettle() {
    proj = null;
    if (birdsUsed >= TOTAL_BIRDS) {
      gState = 'done';
      setTimeout(() => showResult('lose'), 400);
    } else {
      gState = 'ready';
    }
  }

  function stepBldgs() {
    bldgArr.forEach(b => {
      if (b.shake > 0) {
        b.shake = Math.max(0, b.shake - 0.55);
        b.sdx   = b.shake > 0 ? Math.sin(frameN * 0.9) * b.shake * 0.55 : 0;
      }
    });
  }

  function stepDebris() {
    debrisParts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.15; p.vx *= 0.97;
      p.life -= p.decay;
    });
    debrisParts = debrisParts.filter(p => p.life > 0);
  }

  function spawnDebris(x, y, n) {
    const cols = ['#cc3300','#ff6600','#ffd700','#8b0000','#cc6600','#ffaa00','#ff4400'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * 5 + 1.5;
      debrisParts.push({
        x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 3,
        r: Math.random() * 4 + 1.5,
        c: cols[Math.floor(Math.random() * cols.length)],
        life: 1, decay: 0.022
      });
    }
  }

  function updateScoreEl() {
    const sv = document.getElementById('ab-score');
    sv.textContent = score;
    sv.classList.remove('popped');
    void sv.offsetWidth;
    sv.classList.add('popped');
  }

  function showResult(type) {
    const ov = document.getElementById('angry-result');
    const ws = document.getElementById('ab-win-state');
    const ls = document.getElementById('ab-lose-state');
    ov.classList.add('show');
    if (type === 'win') {
      ws.classList.add('active'); ls.classList.remove('active');
      const left = TOTAL_BIRDS - birdsUsed;
      document.getElementById('ab-win-sub').textContent =
        bldgsDown + ' buildings destroyed · ' + left + ' bird' + (left !== 1 ? 's' : '') + ' remaining!';
    } else {
      ls.classList.add('active'); ws.classList.remove('active');
      document.getElementById('ab-lose-sub').textContent =
        'You destroyed ' + bldgsDown + '/10 buildings — so close!';
    }
  }

  /* ─────────── DRAW ─────────── */
  function drawSky() {
    const bg = c2d.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#03000a');
    bg.addColorStop(0.6, '#07001a');
    bg.addColorStop(1, '#0d0008');
    c2d.fillStyle = bg;
    c2d.fillRect(0, 0, W, H);
    // Stars
    for (let i = 0; i < 70; i++) {
      const sx = (i * 173 + 31) % W;
      const sy = (i * 113 + 7)  % (H * 0.65);
      const r  = i % 6 === 0 ? 1.4 : 0.6;
      c2d.globalAlpha = 0.3 + 0.5 * (i % 4 === 0 ? 1 : 0.4);
      c2d.fillStyle = '#fff';
      c2d.beginPath(); c2d.arc(sx, sy, r, 0, Math.PI * 2); c2d.fill();
    }
    c2d.globalAlpha = 1;
    // Moon
    c2d.shadowColor = 'rgba(201,168,76,0.5)'; c2d.shadowBlur = 22;
    c2d.fillStyle   = 'rgba(255,240,180,0.12)';
    c2d.beginPath(); c2d.arc(W * 0.88, 46, 30, 0, Math.PI * 2); c2d.fill();
    c2d.strokeStyle = 'rgba(201,168,76,0.28)'; c2d.lineWidth = 1.5;
    c2d.beginPath(); c2d.arc(W * 0.88, 46, 30, 0, Math.PI * 2); c2d.stroke();
    c2d.shadowBlur = 0;
  }

  function drawGround() {
    const gr = c2d.createLinearGradient(0, GROUND_Y, 0, H);
    gr.addColorStop(0, '#1a0008'); gr.addColorStop(1, '#0a0003');
    c2d.fillStyle = gr;
    c2d.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    c2d.strokeStyle = 'rgba(201,168,76,0.35)'; c2d.lineWidth = 1.5;
    c2d.beginPath(); c2d.moveTo(0, GROUND_Y); c2d.lineTo(W, GROUND_Y); c2d.stroke();
    // Grid lines
    c2d.strokeStyle = 'rgba(201,168,76,0.07)'; c2d.lineWidth = 0.8;
    for (let gx = 0; gx < W; gx += 40) {
      c2d.beginPath(); c2d.moveTo(gx, GROUND_Y); c2d.lineTo(gx + 20, H); c2d.stroke();
    }
  }

  function drawSling() {
    const fx = SLING_X, fy = SLING_Y;
    // Fork arms
    c2d.strokeStyle = 'rgba(160,90,20,0.9)'; c2d.lineWidth = 5; c2d.lineCap = 'round';
    c2d.beginPath(); c2d.moveTo(fx - 16, GROUND_Y); c2d.lineTo(fx - 9, fy - 8); c2d.stroke();
    c2d.beginPath(); c2d.moveTo(fx + 16, GROUND_Y); c2d.lineTo(fx + 9, fy - 8); c2d.stroke();
    // Tips
    c2d.fillStyle = 'rgba(160,90,20,0.85)';
    c2d.beginPath(); c2d.arc(fx - 9, fy - 8, 5, 0, Math.PI * 2); c2d.fill();
    c2d.beginPath(); c2d.arc(fx + 9, fy - 8, 5, 0, Math.PI * 2); c2d.fill();
    // Rubber band
    if (gState === 'ready' || gState === 'start' || dragging) {
      const bx2 = dragging ? dragX : fx;
      const by2 = dragging ? dragY : fy;
      c2d.strokeStyle = 'rgba(220,165,40,0.85)'; c2d.lineWidth = 2.5;
      c2d.beginPath(); c2d.moveTo(fx - 9, fy - 8); c2d.lineTo(bx2, by2); c2d.stroke();
      c2d.beginPath(); c2d.moveTo(fx + 9, fy - 8); c2d.lineTo(bx2, by2); c2d.stroke();
    }
  }

  function drawAimGuide() {
    if (!dragging) return;
    const dx = SLING_X - dragX, dy = SLING_Y - dragY;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d < 5) return;
    const pull  = Math.min(d, MAX_PULL);
    const angle = Math.atan2(dy, dx);
    const power = pull * 0.175;
    let px2 = SLING_X, py2 = SLING_Y;
    let pvx = Math.cos(angle) * power, pvy = Math.sin(angle) * power;
    c2d.setLineDash([6, 9]);
    c2d.strokeStyle = 'rgba(255,215,0,0.38)'; c2d.lineWidth = 1.5;
    c2d.beginPath(); c2d.moveTo(px2, py2);
    for (let i = 0; i < 42; i++) {
      pvx *= 0.999; pvy += GRAV; px2 += pvx; py2 += pvy;
      if (py2 > GROUND_Y || px2 > W) break;
      c2d.lineTo(px2, py2);
    }
    c2d.stroke(); c2d.setLineDash([]);
    // Power ring
    const pct = pull / MAX_PULL;
    const rc  = pct < 0.4 ? 'rgba(201,168,76,0.6)' : pct < 0.7 ? 'rgba(255,165,0,0.8)' : 'rgba(220,50,50,0.9)';
    c2d.strokeStyle = rc; c2d.lineWidth = 2;
    c2d.beginPath(); c2d.arc(SLING_X, SLING_Y, MAX_PULL, 0, Math.PI * 2); c2d.stroke();
  }

  function drawBirdShape(bx, by, scale) {
    c2d.save(); c2d.translate(bx, by); c2d.scale(scale, scale);
    c2d.shadowColor = 'rgba(220,50,50,0.8)'; c2d.shadowBlur = 14;
    // Body
    const bg2 = c2d.createRadialGradient(-4, -4, 2, 0, 0, BIRD_R);
    bg2.addColorStop(0, '#ff5533'); bg2.addColorStop(0.55, '#cc1100'); bg2.addColorStop(1, '#770000');
    c2d.fillStyle = bg2;
    c2d.beginPath(); c2d.arc(0, 0, BIRD_R, 0, Math.PI * 2); c2d.fill();
    c2d.shadowBlur = 0;
    // Head feathers
    c2d.fillStyle = '#cc1100';
    c2d.beginPath();
    c2d.moveTo(-5, -BIRD_R); c2d.lineTo(-3, -BIRD_R - 8); c2d.lineTo(0, -BIRD_R - 2);
    c2d.lineTo(3, -BIRD_R - 9); c2d.lineTo(6, -BIRD_R);
    c2d.closePath(); c2d.fill();
    // Eye whites
    c2d.fillStyle = '#fff';
    c2d.beginPath(); c2d.ellipse(-5, -5, 6, 4, -0.3, 0, Math.PI * 2); c2d.fill();
    c2d.beginPath(); c2d.ellipse(5,  -5, 6, 4,  0.3, 0, Math.PI * 2); c2d.fill();
    // Pupils
    c2d.fillStyle = '#000';
    c2d.beginPath(); c2d.ellipse(-4, -5, 3, 3, 0, 0, Math.PI * 2); c2d.fill();
    c2d.beginPath(); c2d.ellipse(5,  -5, 3, 3, 0, 0, Math.PI * 2); c2d.fill();
    // Angry brows
    c2d.strokeStyle = '#000'; c2d.lineWidth = 2; c2d.lineCap = 'round';
    c2d.beginPath(); c2d.moveTo(-9, -8); c2d.lineTo(-2, -6); c2d.stroke();
    c2d.beginPath(); c2d.moveTo(9,  -8); c2d.lineTo(2,  -6); c2d.stroke();
    // Beak top
    c2d.fillStyle = '#ffaa00';
    c2d.beginPath(); c2d.moveTo(-4, 1); c2d.lineTo(BIRD_R + 2, 0); c2d.lineTo(-4, 4); c2d.closePath(); c2d.fill();
    // Beak chin
    c2d.beginPath(); c2d.moveTo(-4, 3); c2d.lineTo(BIRD_R - 2, 3); c2d.lineTo(-4, 7); c2d.closePath(); c2d.fill();
    // Shine
    c2d.fillStyle = 'rgba(255,255,255,0.22)';
    c2d.beginPath(); c2d.ellipse(-6, -7, 4, 2.5, -0.4, 0, Math.PI * 2); c2d.fill();
    c2d.restore();
  }

  function drawReadyBird() {
    if (gState !== 'ready' && gState !== 'start') return;
    drawBirdShape(dragging ? dragX : SLING_X, dragging ? dragY : SLING_Y, 1);
  }

  function drawProjectile() {
    if (!proj) return;
    // Trail
    proj.trail.forEach(t => {
      c2d.globalAlpha = t.life * 0.28;
      c2d.fillStyle   = '#ff4400';
      const r = BIRD_R * t.life * 0.5;
      c2d.beginPath(); c2d.arc(t.x, t.y, r, 0, Math.PI * 2); c2d.fill();
    });
    c2d.globalAlpha = 1;
    const tilt = Math.atan2(proj.vy, proj.vx) * 0.45;
    c2d.save();
    c2d.translate(proj.x, proj.y); c2d.rotate(tilt); c2d.translate(-proj.x, -proj.y);
    drawBirdShape(proj.x, proj.y, 1);
    c2d.restore();
    c2d.globalAlpha = 1;
  }

  function drawBuildings() {
    for (const b of bldgArr) {
      if (!b.alive) continue;
      const bx2 = b.x + b.sdx;
      const col0 = b.hp === 3 ? '#1a0008' : b.hp === 2 ? '#280510' : '#380008';
      const col1 = b.hp === 3 ? '#2e000e' : b.hp === 2 ? '#3a0818' : '#500008';
      const gr = c2d.createLinearGradient(bx2, 0, bx2 + b.w, 0);
      gr.addColorStop(0, col0); gr.addColorStop(0.5, col1); gr.addColorStop(1, col0);
      c2d.fillStyle = gr;
      c2d.fillRect(bx2, b.y, b.w, b.h);
      // Border
      const bc = b.hp === 3 ? 'rgba(201,168,76,0.35)' : b.hp === 2 ? 'rgba(201,100,20,0.55)' : 'rgba(220,50,50,0.7)';
      c2d.strokeStyle = bc; c2d.lineWidth = 1.5;
      c2d.strokeRect(bx2, b.y, b.w, b.h);
      // Roof glow
      const rg = c2d.createLinearGradient(bx2, b.y, bx2, b.y + 6);
      rg.addColorStop(0, 'rgba(201,168,76,0.3)'); rg.addColorStop(1, 'transparent');
      c2d.fillStyle = rg; c2d.fillRect(bx2, b.y, b.w, 6);
      // Cracks on damaged buildings
      if (b.hp < b.maxHp) {
        c2d.strokeStyle = 'rgba(255,100,30,0.5)'; c2d.lineWidth = 1;
        const numCracks = b.hp === 1 ? 5 : 2;
        for (let ci = 0; ci < numCracks; ci++) {
          const crx = bx2 + ((b.x * 7 + ci * 23) % (b.w - 10)) + 5;
          const cry = b.y  + ((b.h * 3 + ci * 37) % (b.h - 10)) + 5;
          c2d.beginPath(); c2d.moveTo(crx, cry);
          c2d.lineTo(crx + ((ci % 2 === 0) ? 12 : -10), cry + 14);
          c2d.stroke();
        }
      }
      // Windows
      const wRows = Math.floor(b.h / 24);
      for (let row = 0; row < wRows; row++) {
        const lit = ((b.x * 3 + row * 13) % 9) > 4;
        c2d.fillStyle = lit ? 'rgba(255,215,80,0.5)' : 'rgba(255,215,80,0.04)';
        c2d.fillRect(bx2 + 6, b.y + row * 22 + 10, 10, 8);
      }
    }
  }

  function drawWaitingBirds() {
    // Branch
    c2d.strokeStyle = 'rgba(120,60,10,0.7)'; c2d.lineWidth = 6; c2d.lineCap = 'round';
    c2d.beginPath(); c2d.moveTo(12, GROUND_Y - 22); c2d.lineTo(88, GROUND_Y - 22); c2d.stroke();
    let shown = 0;
    for (let i = birdsUsed; i < TOTAL_BIRDS; i++) {
      if (i === birdsUsed && (gState === 'ready' || gState === 'start')) continue;
      drawBirdShape(28 + shown * 22, GROUND_Y - 22 - BIRD_R * 0.7, 0.65);
      shown++;
    }
  }

  function drawDebris() {
    debrisParts.forEach(p => {
      c2d.globalAlpha = p.life;
      c2d.fillStyle   = p.c;
      c2d.beginPath(); c2d.arc(p.x, p.y, p.r, 0, Math.PI * 2); c2d.fill();
    });
    c2d.globalAlpha = 1;
  }

  /* ─────────── LOOP ─────────── */
  let raf;
  function loop() {
    frameN++;
    if (gState === 'flying')    { stepProj(); }
    if (gState === 'settling')  { settleT--; if (settleT <= 0) onSettle(); }
    stepBldgs(); stepDebris();

    drawSky(); drawGround();
    drawBuildings(); drawWaitingBirds();
    drawSling(); drawAimGuide();
    drawReadyBird(); drawProjectile();
    drawDebris();

    raf = requestAnimationFrame(loop);
  }

  /* ── input helpers ── */
  function getPos(e) {
    const rect = CV.getBoundingClientRect();
    const scX  = W / rect.width, scY = H / rect.height;
    const src  = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * scX, y: (src.clientY - rect.top) * scY };
  }

  function clampPull(ex, ey) {
    const dx = ex - SLING_X, dy = ey - SLING_Y;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d > MAX_PULL) return { x: SLING_X + dx / d * MAX_PULL, y: SLING_Y + dy / d * MAX_PULL };
    return { x: ex, y: ey };
  }

  function startDrag(e) {
    if (gState === 'start') {
      gState = 'ready';
      document.getElementById('angry-start').classList.add('hide');
    }
    if (gState !== 'ready') return;
    const pos = getPos(e);
    const dx  = pos.x - SLING_X, dy = pos.y - SLING_Y;
    if (Math.sqrt(dx * dx + dy * dy) < MAX_PULL + 25) {
      dragging = true; dragX = pos.x; dragY = pos.y;
    }
  }

  function moveDrag(e) {
    if (!dragging) return;
    const pos = getPos(e);
    const c   = clampPull(pos.x, pos.y);
    dragX = c.x; dragY = c.y;
  }

  function endDrag(e) {
    if (!dragging) return;
    launch(dragX, dragY);
    dragging = false;
  }

  CV.addEventListener('mousedown',  startDrag);
  CV.addEventListener('mousemove',  moveDrag);
  CV.addEventListener('mouseup',    endDrag);
  CV.addEventListener('mouseleave', endDrag);
  CV.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e); }, { passive: false });
  CV.addEventListener('touchmove',  e => { e.preventDefault(); moveDrag(e);  }, { passive: false });
  CV.addEventListener('touchend',   e => { e.preventDefault(); endDrag(e);   }, { passive: false });
  document.getElementById('angry-start').addEventListener('click', () => {
    gState = 'ready';
    document.getElementById('angry-start').classList.add('hide');
  });

  window.resetAngry = function () {
    cancelAnimationFrame(raf);
    init();
    loop();
  };

  init();
  loop();
})();