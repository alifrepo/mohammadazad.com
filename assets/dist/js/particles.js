(() => {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  const pcountEl = document.getElementById('pcount');
  const magnetToggleBtn = document.getElementById('magnetToggle');
  const resetBtn = document.getElementById('resetBtn');

  // ---------------- CONFIG ----------------
  const CONFIG = {
    initialCount: 120,
    bokehCount: 20,
    bandWidth: 120,
    spread: 560,
    goldRatio: 0.18,
    flowSpeed: 0.00002,
    twinkleSpeed: 0.0006,

    minSize: 0.6,
    maxSize: 2.6,

    // Magnetic mouse interaction
    magnetRadius: 180,
    magnetForce: 1.3,
    springK: 0.03,
    damping: 0.9,

    // Ripple waves (emitted as mouse moves through the field)
    rippleEnabled: true,
    rippleInterval: 70,       // ms between auto-emitted waves while moving
    rippleSpeed: 0.22,        // px per ms — how fast the ring expands
    rippleMaxAge: 1800,       // ms lifetime of a wave
    rippleWidth: 46,          // gaussian ring thickness (px)
    rippleAmplitude: 1.8,     // particle push strength
    rippleMaxWaves: 10,
    clickRippleAmplitude: 7,  // stronger ripple on click
    clickRippleWidth: 70,

    // Click-to-add
    clickBurstCount: 45,
    maxParticles: 3500,

    // Bloom
    glowScale: 0.55,
    blurPx: 10,
    glowSizeMul: 2.6
  };

  let magnetMode = 1; // 1 attract, -1 repel

  const BLUE = [[90,170,255],[110,200,255],[70,140,230],[140,220,255]];
  const GOLD = [[255,190,90],[255,170,60],[255,205,120]];

  let width, height, dpr;
  let particles = [];
  let bokehLights = [];
  let rippleWaves = [];
  let lastRippleSpawn = 0;
  let lastMouse = { x: null, y: null };
  let mouse = { x: 0, y: 0, active: false };
  let curveCache = null;

  let glowCanvas, glowCtx, glowW, glowH;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    glowW = Math.max(1, Math.floor(width * CONFIG.glowScale));
    glowH = Math.max(1, Math.floor(height * CONFIG.glowScale));
    if (!glowCanvas) {
      glowCanvas = document.createElement('canvas');
      glowCtx = glowCanvas.getContext('2d');
    }
    glowCanvas.width = glowW;
    glowCanvas.height = glowH;

    buildCurve();
  }

  function buildCurve() {
    const p0 = { x: -width * 0.15, y: height * 1.05 };
    const p1 = { x: width * 0.15, y: height * 0.55 };
    const p2 = { x: width * 0.55, y: height * 0.25 };
    const p3 = { x: width * 1.2, y: -height * 0.1 };
    curveCache = { p0, p1, p2, p3 };
  }

  function bezier(t, p0, p1, p2, p3) {
    const mt = 1 - t;
    return {
      x: mt*mt*mt*p0.x + 3*mt*mt*t*p1.x + 3*mt*t*t*p2.x + t*t*t*p3.x,
      y: mt*mt*mt*p0.y + 3*mt*mt*t*p1.y + 3*mt*t*t*p2.y + t*t*t*p3.y
    };
  }

  function curveNormal(t) {
    const { p0, p1, p2, p3 } = curveCache;
    const a = bezier(Math.max(0, t - 0.001), p0, p1, p2, p3);
    const b = bezier(Math.min(1, t + 0.001), p0, p1, p2, p3);
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    return { x: -dy/len, y: dx/len };
  }

  function gaussianRandom() {
    return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  }

  function randColor() {
    const isGold = Math.random() < CONFIG.goldRatio;
    const palette = isGold ? GOLD : BLUE;
    return palette[Math.floor(Math.random() * palette.length)];
  }

  function makeCurveParticle() {
    return {
      type: 'curve',
      t: Math.random(),
      offset: gaussianRandom() * (CONFIG.bandWidth / 2 + CONFIG.spread * Math.random()),
      size: CONFIG.minSize + Math.random() * (CONFIG.maxSize - CONFIG.minSize),
      color: randColor(),
      phase: Math.random() * Math.PI * 2,
      baseAlpha: 0.35 + Math.random() * 0.65,
      speedMul: 0.6 + Math.random() * 0.8,
      dx: 0, dy: 0, vx: 0, vy: 0
    };
  }

  function makeFreeParticle(x, y) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.03 + Math.random() * 0.08;
    return {
      type: 'free',
      x, y,
      vxFree: Math.cos(angle) * speed,
      vyFree: Math.sin(angle) * speed,
      size: CONFIG.minSize + Math.random() * (CONFIG.maxSize - CONFIG.minSize) * 1.1,
      color: randColor(),
      phase: Math.random() * Math.PI * 2,
      baseAlpha: 0.4 + Math.random() * 0.6,
      spawnTime: performance.now(),
      dx: 0, dy: 0, vx: 0, vy: 0
    };
  }

  function makeBokeh() {
    return {
      t: Math.random(),
      offset: gaussianRandom() * (CONFIG.bandWidth * 0.7),
      radius: 14 + Math.random() * 46,
      color: randColor(),
      alpha: 0.04 + Math.random() * 0.1,
      phase: Math.random() * Math.PI * 2,
      speedMul: 0.3 + Math.random() * 0.4
    };
  }

  function init() {
    // 1. Reset Physics Vectors & System Counts
    particles = Array.from({ length: CONFIG.initialCount }, makeCurveParticle);
    bokehLights = Array.from({ length: CONFIG.bokehCount }, makeBokeh);
    rippleWaves = [];
    
    // 2. Clear Active Mouse Vectors
    mouse.active = false;
    lastMouse = { x: null, y: null };

    // 3. Reset Operational States to Factory Defaults
    magnetMode = 1; 
    if (magnetToggleBtn) {
      magnetToggleBtn.textContent = 'Attract';
    }

    // 4. Update the Counters
    updateCount();
  }

  function updateCount() {
    if (pcountEl) {
      pcountEl.textContent = particles.length;
    }
  }

  function drawBackground(targetCtx, w, h) {
    targetCtx.clearRect(0, 0, w, h);
  }

  function basePosition(p) {
    if (p.type === 'curve') {
      p.t += CONFIG.flowSpeed * 16 * (p.speedMul || 1);
      if (p.t > 1) p.t -= 1;
      const normal = curveNormal(p.t);
      const pt = bezier(p.t, curveCache.p0, curveCache.p1, curveCache.p2, curveCache.p3);
      return { x: pt.x + normal.x * p.offset, y: pt.y + normal.y * p.offset };
    } else {
      p.x += p.vxFree;
      p.y += p.vyFree;
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;
      return { x: p.x, y: p.y };
    }
  }

  function rippleForceAt(x, y, now) {
    let fx = 0, fy = 0;
    if (!CONFIG.rippleEnabled) return { x: fx, y: fy };
    for (const w of rippleWaves) {
      const age = now - w.startTime;
      if (age < 0 || age > CONFIG.rippleMaxAge) continue;
      const radius = age * CONFIG.rippleSpeed;
      const dx = x - w.x, dy = y - w.y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 0.0001;
      const diff = dist - radius;
      const width_ = w.width || CONFIG.rippleWidth;
      const falloff = Math.exp(-(diff*diff) / (2 * width_ * width_));
      const fade = 1 - age / CONFIG.rippleMaxAge;
      const amp = (w.amplitude || CONFIG.rippleAmplitude) * falloff * fade;
      fx += (dx / dist) * amp;
      fy += (dy / dist) * amp;
    }
    return { x: fx, y: fy };
  }

  function applyForces(p, base, now) {
    const curX = base.x + p.dx;
    const curY = base.y + p.dy;
    let ax = 0, ay = 0;

    if (mouse.active) {
      const mdx = mouse.x - curX;
      const mdy = mouse.y - curY;
      const dist = Math.sqrt(mdx*mdx + mdy*mdy) || 0.0001;
      if (dist < CONFIG.magnetRadius) {
        const strength = (1 - dist / CONFIG.magnetRadius) * CONFIG.magnetForce * magnetMode;
        ax += (mdx / dist) * strength;
        ay += (mdy / dist) * strength;
      }
    }

    const ripple = rippleForceAt(curX, curY, now);
    ax += ripple.x;
    ay += ripple.y;

    ax += -p.dx * CONFIG.springK;
    ay += -p.dy * CONFIG.springK;

    p.vx = (p.vx + ax) * CONFIG.damping;
    p.vy = (p.vy + ay) * CONFIG.damping;
    p.dx += p.vx;
    p.dy += p.vy;

    return { x: base.x + p.dx, y: base.y + p.dy };
  }

  function fadeInFactor(p, now) {
    if (!p.spawnTime) return 1;
    const age = now - p.spawnTime;
    const dur = 900;
    if (age >= dur) return 1;
    return Math.max(0, age / dur);
  }

  function pruneRipples(now) {
    rippleWaves = rippleWaves.filter(w => (now - w.startTime) <= CONFIG.rippleMaxAge);
    if (rippleWaves.length > CONFIG.rippleMaxWaves) {
      rippleWaves.splice(0, rippleWaves.length - CONFIG.rippleMaxWaves);
    }
  }

  function render(now) {
    pruneRipples(now);
    drawBackground(ctx, width, height);

    glowCtx.clearRect(0, 0, glowW, glowH);
    drawBackground(glowCtx, glowW, glowH);
    const s = CONFIG.glowScale;

    glowCtx.globalCompositeOperation = 'lighter';
    for (const b of bokehLights) {
      const normal = curveNormal(b.t);
      const pt = bezier(b.t, curveCache.p0, curveCache.p1, curveCache.p2, curveCache.p3);
      const twinkle = 0.7 + 0.3 * Math.sin(now * CONFIG.twinkleSpeed * b.speedMul + b.phase);
      const x = (pt.x + normal.x * b.offset) * s;
      const y = (pt.y + normal.y * b.offset) * s;
      const g = glowCtx.createRadialGradient(x, y, 0, x, y, b.radius * s);
      const [r, gg, bl] = b.color;
      g.addColorStop(0, `rgba(${r}, ${gg}, ${bl}, ${b.alpha * twinkle})`);
      g.addColorStop(1, `rgba(${r}, ${gg}, ${bl}, 0)`);
      glowCtx.fillStyle = g;
      glowCtx.beginPath();
      glowCtx.arc(x, y, b.radius * s, 0, Math.PI * 2);
      glowCtx.fill();
    }

    const positions = new Array(particles.length);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const base = basePosition(p);
      const pos = applyForces(p, base, now);
      positions[i] = pos;

      if (pos.x < -30 || pos.x > width + 30 || pos.y < -30 || pos.y > height + 30) continue;

      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(now * CONFIG.twinkleSpeed + p.phase));
      const [r, g, b] = p.color;
      const alpha = p.baseAlpha * twinkle * fadeInFactor(p, now);
      const glowR = p.size * CONFIG.glowSizeMul * s;

      const grad = glowCtx.createRadialGradient(pos.x*s, pos.y*s, 0, pos.x*s, pos.y*s, glowR);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${Math.min(1, alpha*1.3)})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      glowCtx.fillStyle = grad;
      glowCtx.beginPath();
      glowCtx.arc(pos.x*s, pos.y*s, glowR, 0, Math.PI * 2);
      glowCtx.fill();
    }
    glowCtx.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.filter = `blur(${CONFIG.blurPx}px)`;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(glowCanvas, 0, 0, width, height);
    ctx.restore();

    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const pos = positions[i];
      if (!pos) continue;
      if (pos.x < -20 || pos.x > width + 20 || pos.y < -20 || pos.y > height + 20) continue;

      const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(now * CONFIG.twinkleSpeed + p.phase));
      const [r, g, b] = p.color;
      const alpha = Math.min(1, p.baseAlpha * twinkle * 1.4 * fadeInFactor(p, now));

      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    requestAnimationFrame(render);
  }

  // Helper to determine if an event target belongs to the interface capsule menu
  function isTargetingUI(target) {
    if (!target) return false;
    return target === magnetToggleBtn || 
           target === resetBtn || 
           magnetToggleBtn.contains(target) || 
           resetBtn.contains(target) ||
           target.closest('.al-corner'); // Catches parent pill structure components
  }

  // ---------------- Global Window Events ----------------
  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', (e) => {
    if (isTargetingUI(e.target)) {
      mouse.active = false;
      return;
    }

    // Convert global window spacing coordinates back down to relative local coordinates
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;

    const now = performance.now();
    if (CONFIG.rippleEnabled && now - lastRippleSpawn > CONFIG.rippleInterval) {
      if (lastMouse.x === null || Math.hypot(mouse.x - lastMouse.x, mouse.y - lastMouse.y) > 4) {
        rippleWaves.push({ x: mouse.x, y: mouse.y, startTime: now });
        lastRippleSpawn = now;
      }
    }
    lastMouse.x = mouse.x;
    lastMouse.y = mouse.y;
  });

  window.addEventListener('mouseleave', () => { mouse.active = false; });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const t = e.touches[0];
      if (isTargetingUI(t.target)) {
        mouse.active = false;
        return;
      }

      const rect = canvas.getBoundingClientRect();
      mouse.x = t.clientX - rect.left;
      mouse.y = t.clientY - rect.top;
      mouse.active = true;

      const now = performance.now();
      if (CONFIG.rippleEnabled && now - lastRippleSpawn > CONFIG.rippleInterval) {
        rippleWaves.push({ x: mouse.x, y: mouse.y, startTime: now });
        lastRippleSpawn = now;
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', () => { mouse.active = false; });

  // ---------------- Targeted Element Events ----------------
  
  // Use global click monitoring to track background vs button hits reliably
  window.addEventListener('click', (e) => {
    if (isTargetingUI(e.target)) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Guardrail boundary check: Only burst if clicking within the display footprint
    if (clickX < 0 || clickX > width || clickY < 0 || clickY > height) return;

    const burst = [];
    for (let i = 0; i < CONFIG.clickBurstCount; i++) {
      burst.push(makeFreeParticle(clickX, clickY));
    }
    particles = particles.concat(burst);
    if (particles.length > CONFIG.maxParticles) {
      particles.splice(0, particles.length - CONFIG.maxParticles);
    }

    rippleWaves.push({
      x: clickX,
      y: clickY,
      startTime: performance.now(),
      amplitude: CONFIG.clickRippleAmplitude,
      width: CONFIG.clickRippleWidth
    });

    updateCount();
  });

  // Magnet Switch Control
  if (magnetToggleBtn) {
    magnetToggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      magnetMode *= -1;
      magnetToggleBtn.textContent = (magnetMode === 1 ? 'Attract' : 'Repel');
    });
  }

  // Engine Reset Trigger
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      init();
    });
  }

  // Start System Loop
  resize();
  init();
  requestAnimationFrame(render);
})();