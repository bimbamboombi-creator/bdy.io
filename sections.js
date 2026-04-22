// ============================================================
// sections.js  —  Scroll-driven scenes
// Joker/ezgif scroll section + "I Have This Much To Give"
// Depends on: frames-data.js
// ============================================================

// ===== EZGIF SCROLL SECTION =====
(function() {
  const ezCanvas  = document.getElementById('canvas-ezgif');
  const ezCtx     = ezCanvas.getContext('2d');
  const ezSection = document.getElementById('section-ezgif');
  const ezProgress= document.getElementById('ezgif-progress');
  const ezText    = document.getElementById('ezgif-text');

  function resizeEz() {
    ezCanvas.width  = window.innerWidth;
    ezCanvas.height = window.innerHeight;
  }
  resizeEz();
  window.addEventListener('resize', resizeEz);

  // Preload
  const ezImgs = ezgifFrames.map(src => {
    const i = new Image(); i.src = src; return i;
  });

  let textShown = false;

  function drawEzFrame(lp) {
    const target = lp * (ezImgs.length - 1);
    const f1 = Math.floor(target);
    const f2 = Math.min(f1 + 1, ezImgs.length - 1);
    const t  = target - f1;
    const img1 = ezImgs[f1];
    if (!img1.complete || !img1.naturalWidth) return;
    const cw = ezCanvas.width, ch = ezCanvas.height;
    const iw = img1.naturalWidth, ih = img1.naturalHeight;
    const s  = Math.max(cw / iw, ch / ih);
    const sw = iw * s, sh = ih * s;
    const ox = (cw - sw) / 2, oy = (ch - sh) / 2;
    ezCtx.clearRect(0, 0, cw, ch);
    ezCtx.globalAlpha = 1 - t;
    ezCtx.drawImage(img1, ox, oy, sw, sh);
    const img2 = ezImgs[f2];
    if (t > 0.01 && img2.complete && img2.naturalWidth) {
      ezCtx.globalAlpha = t;
      ezCtx.drawImage(img2, ox, oy, sw, sh);
    }
    ezCtx.globalAlpha = 1;
  }

  function onEzScroll() {
    const rect = ezSection.getBoundingClientRect();
    const inView = rect.top <= 0 && rect.bottom >= window.innerHeight;
    if (!inView) {
      if (rect.bottom < window.innerHeight) drawEzFrame(1);
      return;
    }
    const lp = Math.min(Math.max(-rect.top / (ezSection.offsetHeight - window.innerHeight), 0), 1);
    drawEzFrame(lp);
    ezProgress.style.width = (lp * 100) + '%';

    // Show center text after 20% scroll
    if (lp > 0.2 && !textShown) {
      textShown = true;
      ezText.classList.add('visible');
    } else if (lp <= 0.2 && textShown) {
      textShown = false;
      ezText.classList.remove('visible');
    }
  }

  window.addEventListener('scroll', onEzScroll, { passive: true });
  drawEzFrame(0);
  onEzScroll();
})();


// ===== GIVE SECTION =====
(function() {
  const gCanvas  = document.getElementById('canvas-give');
  const gCtx     = gCanvas.getContext('2d');
  const gSection = document.getElementById('section-give');
  const gProgress= document.getElementById('give-progress');
  const phases   = [
    document.getElementById('give-p1'),
    document.getElementById('give-p2'),
    document.getElementById('give-p3'),
  ];
  const corners  = ['gv-tl','gv-tr','gv-bl','gv-br'].map(id=>document.getElementById(id));

  function resizeG() {
    gCanvas.width  = window.innerWidth;
    gCanvas.height = window.innerHeight;
  }
  resizeG();
  window.addEventListener('resize', resizeG);

  const gImgs = giveFrames.map(src => {
    const i = new Image(); i.src = src; return i;
  });

  // Phase thresholds: 0–0.33 = p1, 0.33–0.66 = p2, 0.66–1 = p3
  const phaseRanges = [[0, 0.33], [0.33, 0.66], [0.66, 1.0]];
  let prevPhase = -1;

  function drawGFrame(lp) {
    const target = lp * (gImgs.length - 1);
    const f1 = Math.floor(target);
    const f2 = Math.min(f1 + 1, gImgs.length - 1);
    const t  = target - f1;
    const img1 = gImgs[f1];
    if (!img1.complete || !img1.naturalWidth) return;
    const cw = gCanvas.width, ch = gCanvas.height;
    const iw = img1.naturalWidth, ih = img1.naturalHeight;
    const s  = Math.max(cw / iw, ch / ih);
    const sw = iw * s, sh = ih * s;
    const ox = (cw - sw) / 2, oy = (ch - sh) / 2;
    gCtx.clearRect(0, 0, cw, ch);
    gCtx.globalAlpha = 1 - t;
    gCtx.drawImage(img1, ox, oy, sw, sh);
    const img2 = gImgs[f2];
    if (t > 0.01 && img2.complete && img2.naturalWidth) {
      gCtx.globalAlpha = t;
      gCtx.drawImage(img2, ox, oy, sw, sh);
    }
    gCtx.globalAlpha = 1;
  }

  function onGScroll() {
    const rect = gSection.getBoundingClientRect();
    const inView = rect.top <= 0 && rect.bottom >= window.innerHeight;
    if (!inView) {
      if (rect.bottom < window.innerHeight) drawGFrame(1);
      return;
    }

    const lp = Math.min(Math.max(-rect.top / (gSection.offsetHeight - window.innerHeight), 0), 1);
    drawGFrame(lp);
    gProgress.style.width = (lp * 100) + '%';

    // Show corners
    corners.forEach(c => c.classList.add('show'));

    // Determine active phase
    let active = 0;
    for (let i = 0; i < phaseRanges.length; i++) {
      if (lp >= phaseRanges[i][0]) active = i;
    }

    if (active !== prevPhase) {
      phases.forEach((p, i) => {
        p.classList.toggle('visible', i === active);
      });
      prevPhase = active;
    }
  }

  window.addEventListener('scroll', onGScroll, { passive: true });
  drawGFrame(0);
  onGScroll();
})();