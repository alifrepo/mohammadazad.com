/* ============================================================
   COMPONENTS REGISTRATION MATRIX
   Toggle hasModal true/false and pass targeted template IDs
============================================================ */
const COMPONENT_IMAGES = [
  {src:'assets/img/portfolio/1.jpg', w:130, h:90,  hasModal: true,  id: 'fuiModal-1'},
  {src:'assets/img/portfolio/2.jpg', w:96,  h:96,  hasModal: false, link: 'https://alfuix.com'}, 
  {src:'assets/img/portfolio/3.jpg', w:150, h:80,  hasModal: true,  id: 'fuiModal-3'},
  {src:'assets/img/portfolio/4.jpg', w:110, h:110, hasModal: true,  id: 'fuiModal-4'}
];

function fuiGetTier(){
  const w = window.innerWidth;
  if(w < 640) return 'mobile';
  if(w < 1024) return 'tablet';
  return 'desktop';
}

/* ============================================================
   Sphere core projection computational engine
============================================================ */
const App = (() => {
  const cv = document.getElementById('fui-sphere');
  if(!cv) return { setTilt: () => {}, handleManualDrag: () => {}, stopManualDrag: () => {} };
  
  const ctx = cv.getContext('2d');
  const stage = document.getElementById('fui-stage');
  const layer = document.getElementById('fui-img-layer');
  
  const glowEl = document.querySelector('.fui-radial-glow');
  const swpEl = document.querySelector('.fui-sweep');
  const coreEl = document.querySelector('.fui-core');

  let dpr = Math.min(window.devicePixelRatio || 1, 2), W, H, cx, cy, R;
  let nodes = [], edges = [];
  let rotY = 0, curRX = 0, curRY = 0, tRX = 0, tRY = 0, t = 0, scan = 0;
  let dragRotY = 0, dragRotX = 0;
  let velY = 0, velX = 0;
  let dragging = false;
  let hovered = false; 
  let imgs = [];
  let ringAngle = 0;

  let mx = 0, my = 0, hintOpacity = 0, insideCanvas = false;

  let themePrimaryRGB = '52,224,161';
  let themeInfoRGB = '31,174,140';

  function updateThemeColors() {
    const rootStyle = getComputedStyle(document.documentElement);
    themePrimaryRGB = rootStyle.getPropertyValue('--bs-primary-rgb').trim() || '52,224,161';
    themeInfoRGB = rootStyle.getPropertyValue('--bs-info-rgb').trim() || '31,174,140';
  }

  function build() {
    nodes = []; edges = [];
    const tier = fuiGetTier();
    const N = tier === 'mobile' ? 34 : tier === 'tablet' ? 46 : 54;
    const phi = Math.PI * (3 - Math.sqrt(5));
    
    for(let i = 0; i < N; i++) {
      const y = 1 - i / (N - 1) * 2;
      const r2 = Math.sqrt(1 - y * y);
      const th = phi * i;
      nodes.push({x: Math.cos(th) * r2, y, z: Math.sin(th) * r2, pulse: Math.random() * Math.PI * 2});
    }
    
    for(let i = 0; i < N; i++) {
      for(let j = i + 1; j < N; j++) {
        const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y, nodes[i].z - nodes[j].z);
        if(d < 0.64) edges.push([i, j]);
      }
    }

    function pickSpreadIndices(count) {
      const candidates = nodes
        .map((n, i) => ({ i, theta: Math.atan2(n.z, n.x) }))
        .filter(o => Math.abs(nodes[o.i].y) < 0.35);
      const pool = candidates.length >= count ? candidates : nodes.map((n, i) => ({ i, theta: Math.atan2(n.z, n.x) }));
      pool.sort((a, b) => a.theta - b.theta);
      const picks = [];
      for(let k = 0; k < count; k++) {
        const idx = Math.floor((k * pool.length) / count);
        picks.push(pool[idx].i);
      }
      return picks;
    }

    imgs = []; 
    if (layer) layer.innerHTML = '';
    const count = Math.min(COMPONENT_IMAGES.length, N);
    const vf = Math.min(1, window.innerWidth / 1280);
    
    let rspScale;
    if(tier === 'mobile')       rspScale = 0.46 + 0.20 * vf;
    else if(tier === 'tablet')  rspScale = 0.58 + 0.28 * vf;
    else                        rspScale = 0.62 + 0.38 * vf;

    const nodeIndices = pickSpreadIndices(count);

    for(let k = 0; k < count; k++) {
      const ni = nodeIndices[k];
      const item = COMPONENT_IMAGES[k];
      
      const a = document.createElement('a');
      a.className = 'fui-node-img';
      a.style.pointerEvents = 'auto';
      
      a.dataset.hasModal = item.hasModal ? 'true' : 'false';
      if (item.hasModal && item.id) {
        a.href = '#' + item.id;
        a.dataset.modalTarget = item.id;
      } else {
        a.href = item.link || '#';
        if(item.link && item.link !== '#') a.target = '_blank';
      }
      
      if(item.w) { a.style.width = (item.w * rspScale).toFixed(0) + 'px'; }
      
      const el = document.createElement('img');
      el.src = item.src;
      el.alt = 'component ' + (k + 1);
      if(item.w) { el.style.width = '100%'; }
      if(item.h && item.w) { 
        el.style.height = (item.h * rspScale).toFixed(0) + 'px'; 
        el.style.objectFit = 'cover'; 
      }
      el.draggable = false;
      
      a.appendChild(el);
      
      a.addEventListener('pointerenter', () => { hovered = true; });
      a.addEventListener('pointerleave', () => { hovered = false; });
      
      if (layer) layer.appendChild(a);
      imgs.push({el: a, ni, w: 0, h: 0});
    }
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;

    W = cv.width = Math.round(r.width * dpr);
    H = cv.height = Math.round(r.height * dpr);
    cv.style.width = r.width + 'px'; 
    cv.style.height = r.height + 'px';

    const tier = fuiGetTier();
    const radiusFactor = tier === 'mobile' ? 0.24 : tier === 'tablet' ? 0.27 : 0.30;
    R = Math.min(W, H) * radiusFactor;

    cx = W * 0.5;
    cy = H * 0.5;

    const cssX = cx / dpr, cssY = cy / dpr;
    if(glowEl) { glowEl.style.left = cssX + 'px'; glowEl.style.top = cssY + 'px'; }
    if(swpEl)  { swpEl.style.left = cssX + 'px';  swpEl.style.top = cssY + 'px'; }
    if(coreEl) { coreEl.style.left = cssX + 'px'; coreEl.style.top = cssY + 'px'; }
    
    imgs.forEach(o => {
      o.w = o.el.offsetWidth;
      o.h = o.el.offsetHeight;
    });
  }

  function drawRings() {
    const ccx = cx, ccy = cy;
    const r1 = R * 1.36;
    
    ctx.save();
    ctx.translate(ccx, ccy);
    ctx.rotate(ringAngle);
    ctx.setLineDash([8 * dpr, 40 * dpr]);
    ctx.lineDashOffset = -(t * 40 * dpr) % ((8 + 10) * dpr);
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = `rgba(${themeInfoRGB}, 0.20)`;
    ctx.beginPath(); ctx.arc(0, 0, r1, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    const r2 = R * 1.30;
    ctx.save();
    ctx.translate(ccx, ccy);
    ctx.setLineDash([]);
    ctx.lineWidth = 1 * dpr;
    ctx.strokeStyle = `rgba(${themePrimaryRGB}, 0.28)`;
    ctx.beginPath(); ctx.arc(0, 0, r2, 0, Math.PI * 2); ctx.stroke();
    
    const da = -ringAngle * 1.6;
    const dx = Math.cos(da) * r2, dy = Math.sin(da) * r2;
    
    ctx.beginPath(); ctx.arc(dx, dy, 7 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${themePrimaryRGB}, 0.18)`; ctx.fill();
    
    ctx.beginPath(); ctx.arc(dx, dy, 3 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    
    for(let i = 1; i <= 10; i++) {
      const ta = da + i * 0.05;
      const tx = Math.cos(ta) * r2, ty = Math.sin(ta) * r2;
      ctx.beginPath(); ctx.arc(tx, ty, (3 - i * 0.25) * dpr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${themePrimaryRGB}, ${0.5 * (1 - i / 10)})`; ctx.fill();
    }
    ctx.restore();
  }

  function drawInteractiveHint() {
    if (hintOpacity <= 0 || dragging) return;
    
    ctx.save();
    ctx.translate(mx, my);
    
    ctx.lineWidth = 1 * dpr;
    ctx.strokeStyle = `rgba(${themePrimaryRGB}, ${hintOpacity * 0.4})`;
    ctx.setLineDash([4 * dpr, 6 * dpr]);
    ctx.beginPath();
    ctx.arc(0, 0, 24 * dpr, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.setLineDash([]);
    ctx.fillStyle = `rgba(${themePrimaryRGB}, ${hintOpacity * 0.7})`;
    ctx.beginPath();
    ctx.arc(0, 0, 2 * dpr, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = `rgba(${themePrimaryRGB}, ${hintOpacity * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(0, -28 * dpr); ctx.lineTo(0, -34 * dpr);
    ctx.moveTo(28 * dpr, 0); ctx.lineTo(34 * dpr, 0);
    ctx.stroke();
    
    ctx.fillStyle = `rgba(${themePrimaryRGB}, ${hintOpacity * 0.85})`;
    ctx.font = `500 ${9 * dpr}px var(--bs-font-monospace, monospace)`;
    ctx.fillText("DRAG TO ROTATE GLOBE", 40 * dpr, 3 * dpr);
    
    ctx.restore();
  }

  function project(n) {
    const ry = rotY + dragRotY + curRY;
    const rx = dragRotX + curRX;
    const sy = Math.sin(ry), cyy = Math.cos(ry);
    let x = n.x * cyy + n.z * sy, z = -n.x * sy + n.z * cyy;
    const sx = Math.sin(rx), cxx = Math.cos(rx);
    let y = n.y * cxx - z * sx; z = n.y * sx + z * cxx;
    const persp = 1.9, sc = persp / (persp + z);
    return {sx: cx + x * R * sc, sy: cy + y * R * sc, z, sc};
  }

  function frame() {
    t += 0.016;
    
    if(!dragging && !hovered) {
      rotY += 0.0024;
      ringAngle += 0.006;
    }

    if(!dragging) {
      dragRotY += velY; dragRotX += velX;
      velY *= 0.94; velX *= 0.94;
      if(Math.abs(velY) < 0.00002) velY = 0;
      if(Math.abs(velX) < 0.00002) velX = 0;
    }
    
    const lim = Math.PI / 2 * 0.92;
    if(dragRotX > lim)  { dragRotX = lim; velX = 0; }
    if(dragRotX < -lim) { dragRotX = -lim; velX = 0; }

    curRX += (tRX - curRX) * 0.05; 
    curRY += (tRY - curRY) * 0.05;
    scan = (scan + 0.004) % 1;

    const distanceToGlobeCenter = Math.hypot(mx - cx, my - cy);
    const showsHint = insideCanvas && !hovered && (distanceToGlobeCenter > R * 1.4);
    
    if (showsHint) {
      hintOpacity = Math.min(1, hintOpacity + 0.08);
    } else {
      hintOpacity = Math.max(0, hintOpacity - 0.12);
    }

    if (W > 0 && H > 0) {
      ctx.clearRect(0, 0, W, H);
      const proj = nodes.map(n => ({...project(n), n}));

      drawRings();

      for(const [a, b] of edges) {
        const pa = proj[a], pb = proj[b], avgZ = (pa.z + pb.z) / 2, depth = Math.max(0, (1 - avgZ) / 2);
        let alpha = 0.05 + depth * 0.30;
        const band = Math.abs(((avgZ + 1) / 2) - scan);
        if(band < 0.06) alpha = Math.min(0.9, alpha + (0.06 - band) * 9);
        ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pb.sx, pb.sy);
        ctx.strokeStyle = `rgba(${themePrimaryRGB}, ${alpha})`; ctx.lineWidth = (0.5 + depth * 0.7) * dpr; ctx.stroke();
      }
      
      for(const o of imgs) {
        const pj = proj[o.ni];
        const depth = Math.max(0, (1 - pj.z) / 2);
        const sx = pj.sx / dpr, sy = pj.sy / dpr;
        const ox = (sx - cx / dpr), oy = (sy - cy / dpr), len = Math.hypot(ox, oy) || 1;
        const scale = 0.55 + depth * 0.6;
        const push = 12;
        const ix = sx + (ox / len) * push;
        const iy = sy + (oy / len) * push;
        const imgR = (Math.max(o.w, o.h) * scale) / 2;
        const ax = ix - (ox / len) * imgR * 0.55;
        const ay = iy - (oy / len) * imgR * 0.55;
        const x1 = pj.sx, y1 = pj.sy, x2 = ax * dpr, y2 = ay * dpr;
        const lineA = (0.18 + depth * 0.42) * Math.max(0, Math.min(1, (depth - 0.16) * 1.7));
        
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(${themeInfoRGB}, ${lineA})`; ctx.lineWidth = 1 * dpr; ctx.stroke();
        
        const tp = ((t * 0.5 + o.ni * 0.21) % 1);
        const px = x1 + (x2 - x1) * tp, py = y1 + (y2 - y1) * tp;
        ctx.beginPath(); ctx.arc(px, py, 1.8 * dpr, 0, 7);
        ctx.fillStyle = `rgba(${themePrimaryRGB}, ${lineA * 1.6})`; ctx.fill();
        
        ctx.beginPath(); ctx.arc(x2, y2, 2.2 * dpr, 0, 7);
        ctx.fillStyle = `rgba(${themePrimaryRGB}, ${lineA})`; ctx.fill();
      }
      
      for(const p of proj) {
        const depth = Math.max(0.15, (1 - p.z) / 2);
        const pulse = Math.sin(t * 1.6 + p.n.pulse) * 0.4 + 0.6;
        const r = (1.1 + depth * 2.0) * dpr * (0.7 + pulse * 0.5);
        ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, 7);
        ctx.fillStyle = `rgba(${themePrimaryRGB}, ${0.35 + depth * 0.55})`; ctx.fill();
        if(depth > 0.7) { 
          ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 2.6, 0, 7);
          ctx.fillStyle = `rgba(${themePrimaryRGB}, ${0.06 * pulse})`; ctx.fill(); 
        }
      }

      for(const o of imgs) {
        const pj = proj[o.ni];
        const sx = pj.sx / dpr, sy = pj.sy / dpr;
        const depth = (1 - pj.z) / 2;
        const scale = 0.55 + depth * 0.6;
        const opacity = Math.max(0, Math.min(1, (depth - 0.16) * 1.7));
        const ox = (sx - cx / dpr), oy = (sy - cy / dpr), len = Math.hypot(ox, oy) || 1, push = 12;
        const tx = sx + (ox / len) * push - (o.w * scale) / 2;
        const ty = sy + (oy / len) * push - (o.h * scale) / 2;
        
        o.el.style.transform = `translate3d(${tx}px,${ty}px,0) scale(${scale.toFixed(3)})`;
        o.el.style.opacity = opacity.toFixed(2);
        o.el.style.zIndex = String(1000 + Math.round(depth * 1000));
        o.el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
      }

      drawInteractiveHint();
    }

    requestAnimationFrame(frame);
  }

  function setTilt(rx, ry) { tRX = rx; tRY = ry; }

  function handleManualDrag(clientX, clientY) {
    const dx = clientX - lastX, dy = clientY - lastY;
    lastX = clientX; lastY = clientY;
    const k = 0.006;
    dragRotY += dx * k;
    dragRotX += dy * k;
    velY = dx * k; velX = dy * k;
  }

  function stopManualDrag() {
    dragging = false;
    cv.classList.remove('fui-dragging');
  }

  cv.addEventListener('pointerdown', e => {
    dragging = true; activeId = e.pointerId;
    lastX = e.clientX; lastY = e.clientY;
    velX = 0; velY = 0;
    cv.classList.add('fui-dragging');
    try { cv.setPointerCapture(e.pointerId); } catch(_) {}
  });
  
  cv.addEventListener('pointermove', e => {
    const rect = cv.getBoundingClientRect();
    mx = (e.clientX - rect.left) * dpr;
    my = (e.clientY - rect.top) * dpr;
    insideCanvas = true;

    if(!dragging || e.pointerId !== activeId) return;
    handleManualDrag(e.clientX, e.clientY);
  });
  
  cv.addEventListener('pointerenter', () => { insideCanvas = true; });
  cv.addEventListener('pointerleave', () => { insideCanvas = false; hintOpacity = 0; stopManualDrag(); });
  cv.addEventListener('pointerup', stopManualDrag);
  cv.addEventListener('pointercancel', stopManualDrag);

  let rt;
  const scheduleResize = () => {
    clearTimeout(rt);
    rt = setTimeout(() => { build(); updateThemeColors(); resize(); }, 100);
  };

  window.addEventListener('resize', scheduleResize);

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => { scheduleResize(); });
    ro.observe(stage);
  }

  document.querySelectorAll('[data-bs-toggle="tab"], [data-bs-toggle="pill"]').forEach(tabEl => {
    tabEl.addEventListener('shown.bs.tab', () => {
      build();
      updateThemeColors();
      resize();
    });
  });

  updateThemeColors();
  build();
  resize();
  
  window.addEventListener('load', () => { updateThemeColors(); resize(); });
  requestAnimationFrame(() => { resize(); frame(); });
  
  return { setTilt, handleManualDrag, stopManualDrag, dragging: () => dragging };
})();

/* ============================================================
   Parallax Control Layer + HTML Image Node Pointer Detection
============================================================ */
(() => {
  const stage = document.getElementById('fui-stage');
  if(!stage) return;
  let tx = 0, ty = 0, cxv = 0, cyv = 0;
  
  function set(cxp, cyp) {
    const r = stage.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    tx = Math.max(-1, Math.min(1, (cxp - (r.left + r.width / 2)) / (r.width / 2)));
    ty = Math.max(-1, Math.min(1, (cyp - (r.top + r.height / 2)) / (r.height / 2)));
  }
  
  window.addEventListener('mousemove', e => set(e.clientX, e.clientY));
  window.addEventListener('touchmove', e => {
    if(e.touches[0]) set(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  let downX = 0, downY = 0, hasDraggedNode = false, activeNodePointerId = null;

  const imgLayer = document.getElementById('fui-img-layer');
  if(imgLayer) {
    imgLayer.addEventListener('pointerdown', e => {
      const targetAnchor = e.target.closest('.fui-node-img');
      if(targetAnchor) {
        downX = e.clientX;
        downY = e.clientY;
        hasDraggedNode = false;
        activeNodePointerId = e.pointerId;
        try { targetAnchor.setPointerCapture(e.pointerId); } catch(_) {}
      }
    });

    imgLayer.addEventListener('pointermove', e => {
      if (activeNodePointerId !== e.pointerId) return;
      
      const targetAnchor = e.target.closest('.fui-node-img');
      if (targetAnchor) {
        const delta = Math.hypot(e.clientX - downX, e.clientY - downY);
        if (delta > 6) {
          hasDraggedNode = true;
          App.handleManualDrag(e.clientX, e.clientY);
        }
      }
    });

    const releaseNodeCapture = (e) => {
      if (activeNodePointerId === e.pointerId) {
        activeNodePointerId = null;
        App.stopManualDrag();
      }
    };

    imgLayer.addEventListener('pointerup', releaseNodeCapture);
    imgLayer.addEventListener('pointercancel', releaseNodeCapture);

    imgLayer.addEventListener('click', e => {
      if(hasDraggedNode) {
        e.preventDefault();
        e.stopPropagation();
        return; 
      }

      const targetAnchor = e.target.closest('.fui-node-img');
      if(targetAnchor) {
        if(targetAnchor.dataset.hasModal === 'true') {
          e.preventDefault();
          e.stopPropagation();
          
          const targetModalEl = document.getElementById(targetAnchor.dataset.modalTarget);
          if(targetModalEl) {
            const bsModal = bootstrap.Modal.getOrCreateInstance(targetModalEl);
            bsModal.show();
          }
        }
      }
    }, false);
  }

  (function loop() {
    cxv += (tx - cxv) * 0.06; cyv += (ty - cyv) * 0.06;
    const tier = fuiGetTier();
    const strength = tier === 'mobile' ? 0.6 : 1;
    App.setTilt(cyv * 0.4 * strength, cxv * 0.6 * strength);
    requestAnimationFrame(loop);
  })();
})();

/* ============================================================
   VIEW TOGGLE — Globe view  ⇄  Plain card view
============================================================ */
(() => {
  function initFuiViewToggle() {
    const toggle = document.querySelector('.fui-view-toggle');
    const stageEl = document.getElementById('fui-stage');
    const bgLayersEl = document.querySelector('.fui-bg-layers');
    
    const globePanels = Array.from(document.querySelectorAll('[data-fui-panel="globe"]'));
    const cardPanels = Array.from(document.querySelectorAll('[data-fui-panel="cards"]'));
    const STORAGE_KEY = 'fuiProductView';

    function activate(view) {
      if(stageEl)    stageEl.classList.toggle('fui-active', view === 'globe');
      if(bgLayersEl) bgLayersEl.classList.toggle('fui-active', view === 'globe');

      globePanels.forEach(p => p.classList.toggle('fui-view-panel-hidden', view !== 'globe'));
      cardPanels.forEach(p => p.classList.toggle('fui-view-panel-hidden', view !== 'cards'));

      if(toggle) {
        toggle.querySelectorAll('.fui-view-btn').forEach(b => {
          const isActive = b.dataset.fuiView === view;
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
      }
      try { localStorage.setItem(STORAGE_KEY, view); } catch(_) {}
    }

    if(toggle) {
      toggle.querySelectorAll('.fui-view-btn').forEach(btn => {
        btn.addEventListener('click', () => activate(btn.dataset.fuiView));
      });
    }

    let stored = null;
    try { stored = localStorage.getItem(STORAGE_KEY); } catch(_) {}
    const initial = stored || (fuiGetTier() === 'desktop' ? 'globe' : 'cards');
    activate(initial);

    if(!stored) {
      let rt;
      window.addEventListener('resize', () => {
        clearTimeout(rt);
        rt = setTimeout(() => {
          let s = null;
          try { s = localStorage.getItem(STORAGE_KEY); } catch(_) {}
          if(!s) activate(fuiGetTier() === 'desktop' ? 'globe' : 'cards');
        }, 150);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFuiViewToggle);
  } else {
    initFuiViewToggle();
  }
})();