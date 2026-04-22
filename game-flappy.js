// ============================================================
// game-flappy.js  —  Flappy Bird
// Win: score 10 points → poem reward
// ============================================================

// ===== FLAPPY BIRD =====
(function() {
  const canvas  = document.getElementById('flappy-canvas');
  const ctx     = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const WIN_SCORE = 10;
  const GRAVITY   = 0.42;
  const FLAP_VY   = -7.2;
  const PIPE_W    = 52;
  const PIPE_GAP  = 130;
  const PIPE_SPEED= 2.4;
  const BIRD_X    = 100;
  const BIRD_R    = 16;

  let bird, pipes, score, best, gameState, frameCount, particlesList;
  // gameState: 'start' | 'playing' | 'dead' | 'won'

  function init() {
    bird = { y: H/2, vy: 0, angle: 0, flapAnim: 0 };
    pipes = [];
    score = 0;
    frameCount = 0;
    particlesList = [];
    gameState = 'start';
    updateScoreUI();
    buildPips();
    document.getElementById('flappy-overlay').classList.remove('show');
    document.getElementById('flappy-win-state').classList.remove('active');
    document.getElementById('flappy-lose-state').classList.remove('active');
    document.getElementById('flappy-start').classList.remove('hide');
  }

  function buildPips() {
    const row = document.getElementById('fpips');
    row.innerHTML = '';
    for (let i = 0; i < WIN_SCORE; i++) {
      const d = document.createElement('div');
      d.className = 'flappy-pip';
      d.id = 'fpip-' + i;
      row.appendChild(d);
    }
  }

  function updateScoreUI() {
    const sv = document.getElementById('fscore');
    const bv = document.getElementById('fbest');
    sv.textContent = score;
    bv.textContent = best || 0;
    sv.classList.remove('popped');
    void sv.offsetWidth;
    sv.classList.add('popped');
    for (let i = 0; i < WIN_SCORE; i++) {
      const p = document.getElementById('fpip-' + i);
      if (p) p.classList.toggle('lit', i < score);
    }
  }

  // ---- Pipe spawning ----
  function spawnPipe() {
    const minTop = 60, maxTop = H - PIPE_GAP - 60;
    const topH = minTop + Math.random() * (maxTop - minTop);
    pipes.push({ x: W + 10, topH, passed: false });
  }

  // ---- Particles ----
  function spawnScoreParticles(x, y) {
    const cols = ['#ffd700','#ff1a1a','#f0d080','#ffffff','#ff6600'];
    for (let i = 0; i < 25; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * 4 + 1.5;
      particlesList.push({
        x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s - 2,
        r: Math.random()*3+1.5,
        color: cols[Math.floor(Math.random()*cols.length)],
        life: 1, decay: 0.03
      });
    }
  }

  // ---- Draw ----
  function drawBackground() {
    // Night sky gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#060010');
    bg.addColorStop(0.6, '#0d0018');
    bg.addColorStop(1, '#120008');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    // deterministic stars from seed
    for (let i = 0; i < 50; i++) {
      const sx = ((i * 137 + 23) % W);
      const sy = ((i * 97 + 11) % (H * 0.75));
      const sr = (i % 3 === 0) ? 1.2 : 0.7;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI*2);
      ctx.fill();
    }

    // Ground
    const groundY = H - 40;
    const grd = ctx.createLinearGradient(0, groundY, 0, H);
    grd.addColorStop(0, '#1a0008');
    grd.addColorStop(1, '#0a0003');
    ctx.fillStyle = grd;
    ctx.fillRect(0, groundY, W, 40);

    // Ground line
    ctx.strokeStyle = 'rgba(201,168,76,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, groundY); ctx.lineTo(W, groundY);
    ctx.stroke();

    // Moving grid on ground
    const gOff = (frameCount * PIPE_SPEED * 0.5) % 40;
    ctx.strokeStyle = 'rgba(201,168,76,0.1)';
    ctx.lineWidth = 0.8;
    for (let gx = -gOff; gx < W; gx += 40) {
      ctx.beginPath();
      ctx.moveTo(gx, groundY); ctx.lineTo(gx + 20, H);
      ctx.stroke();
    }
  }

  function drawPipe(pipe) {
    const { x, topH } = pipe;
    const botY = topH + PIPE_GAP;

    // Pipe glow
    ctx.shadowColor = 'rgba(139,0,0,0.5)';
    ctx.shadowBlur  = 12;

    // Top pipe
    const tg = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
    tg.addColorStop(0, '#3a0010');
    tg.addColorStop(0.4, '#6a0020');
    tg.addColorStop(1, '#2a0008');
    ctx.fillStyle = tg;
    ctx.fillRect(x, 0, PIPE_W, topH);

    // Top cap
    ctx.fillRect(x - 5, topH - 18, PIPE_W + 10, 18);

    // Bottom pipe
    ctx.fillStyle = tg;
    ctx.fillRect(x, botY, PIPE_W, H - botY);

    // Bottom cap
    ctx.fillRect(x - 5, botY, PIPE_W + 10, 18);

    // Gold rim highlights
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(201,168,76,0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, 0, PIPE_W, topH);
    ctx.strokeRect(x, botY, PIPE_W, H - botY);

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
  }

  function drawBird() {
    const by = bird.y;
    bird.angle = Math.max(-0.45, Math.min(Math.PI/2.2, bird.vy * 0.065));

    ctx.save();
    ctx.translate(BIRD_X, by);
    ctx.rotate(bird.angle);

    // Body glow
    ctx.shadowColor = 'rgba(255,215,0,0.6)';
    ctx.shadowBlur = 14;

    // Body
    const bodyGrd = ctx.createRadialGradient(-4, -4, 2, 0, 0, BIRD_R);
    bodyGrd.addColorStop(0, '#ffe066');
    bodyGrd.addColorStop(0.55, '#ffaa00');
    bodyGrd.addColorStop(1, '#cc6600');
    ctx.fillStyle = bodyGrd;
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_R, BIRD_R * 0.85, 0, 0, Math.PI*2);
    ctx.fill();

    // Wing flap
    const wAngle = Math.sin(bird.flapAnim) * 0.6;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.save();
    ctx.rotate(-wAngle);
    ctx.ellipse(-4, 4, BIRD_R * 0.7, BIRD_R * 0.38, 0.4, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Eye
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(7, -4, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(8.5, -4, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(9, -5, 0.9, 0, Math.PI*2); ctx.fill();

    // Beak
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.moveTo(BIRD_R - 2, -2);
    ctx.lineTo(BIRD_R + 10, 0);
    ctx.lineTo(BIRD_R - 2, 3);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particlesList) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawHUD() {
    // Score on canvas
    ctx.font = 'bold 28px "Cinzel Decorative", serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillText(score, W/2, 50);
  }

  function drawDeadFlash() {
    ctx.fillStyle = 'rgba(200,0,0,0.18)';
    ctx.fillRect(0, 0, W, H);
  }

  // ---- Physics / update ----
  function update() {
    if (gameState !== 'playing') return;

    frameCount++;
    bird.vy += GRAVITY;
    bird.y  += bird.vy;
    bird.flapAnim += 0.35;

    // Spawn pipes
    if (frameCount % 90 === 0) spawnPipe();

    // Move pipes
    for (const p of pipes) {
      p.x -= PIPE_SPEED;

      // Score
      if (!p.passed && p.x + PIPE_W < BIRD_X) {
        p.passed = true;
        score++;
        if (score > (best || 0)) best = score;
        updateScoreUI();
        spawnScoreParticles(BIRD_X, bird.y - 30);
        if (score >= WIN_SCORE) {
          gameState = 'won';
          setTimeout(() => showFlappyResult('win'), 600);
          return;
        }
      }
    }

    // Remove off-screen pipes
    pipes = pipes.filter(p => p.x + PIPE_W > -20);

    // Update particles
    particlesList.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.12; p.life -= p.decay;
    });
    particlesList = particlesList.filter(p => p.life > 0);

    // Collision: ground / ceiling
    if (bird.y + BIRD_R >= H - 40 || bird.y - BIRD_R <= 0) {
      die();
    }

    // Collision: pipes
    for (const p of pipes) {
      const bLeft  = BIRD_X - BIRD_R + 4;
      const bRight = BIRD_X + BIRD_R - 4;
      const bTop   = bird.y - BIRD_R + 4;
      const bBot   = bird.y + BIRD_R - 4;
      if (bRight > p.x && bLeft < p.x + PIPE_W) {
        if (bTop < p.topH || bBot > p.topH + PIPE_GAP) {
          die(); return;
        }
      }
    }
  }

  function die() {
    gameState = 'dead';
    setTimeout(() => showFlappyResult('lose'), 700);
  }

  function flap() {
    if (gameState === 'start') {
      gameState = 'playing';
      document.getElementById('flappy-start').classList.add('hide');
    }
    if (gameState === 'playing') {
      bird.vy = FLAP_VY;
      bird.flapAnim = 0;
    }
  }

  function showFlappyResult(type) {
    const ov = document.getElementById('flappy-overlay');
    const ws = document.getElementById('flappy-win-state');
    const ls = document.getElementById('flappy-lose-state');
    ov.classList.add('show');
    if (type === 'win') {
      ws.classList.add('active');
      ls.classList.remove('active');
    } else {
      ls.classList.add('active');
      ws.classList.remove('active');
      document.getElementById('flappy-lose-msg').textContent =
        score > 0
          ? `You scored ${score} — so close to 10!`
          : "Keep going — you can do it!";
    }
  }

  window.resetFlappy = function() {
    init();
    loop();
  };

  // ---- Main loop ----
  let rafId;
  let deathFlash = 0;
  function loop() {
    cancelAnimationFrame(rafId);
    update();
    drawBackground();
    pipes.forEach(drawPipe);
    drawParticles();
    drawBird();
    drawHUD();
    if (gameState === 'dead') { deathFlash++; if (deathFlash < 8) drawDeadFlash(); }
    else { deathFlash = 0; }
    rafId = requestAnimationFrame(loop);
  }

  // ---- Input ----
  canvas.addEventListener('click',     flap);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); flap(); }, { passive: false });
  document.addEventListener('keydown',  e => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); flap(); } });

  // Start screen click
  document.getElementById('flappy-start').addEventListener('click', flap);

  init();
  loop();
})();