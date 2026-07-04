/* ============================================================
   FUIStudio — main.js
   Clock · sound toggle · tabs · glitch text
   ============================================================ */
(() => {
  'use strict';

  const mqDesktop = window.matchMedia('(min-width: 992px)');

  /* ---------- Live New York clock ---------- */
  const clockEl = document.getElementById('clock');
  const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' });
  const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  const tick = () => {
    if (!clockEl) return;
    const now = new Date();
    clockEl.textContent = `${dateFmt.format(now)}, ${timeFmt.format(now)} New York`.toUpperCase();
  };
  tick();
  setInterval(tick, 1000);

  /* ---------- Sound toggle ---------- */
  const soundBtn = document.getElementById('soundToggle');
  let soundOn = false;
  soundBtn?.addEventListener('click', () => {
    soundOn = !soundOn;
    soundBtn.innerHTML = `<i class="bi bi-volume-${soundOn ? 'up' : 'mute'}"></i>`;
  });

  /* ---------- Glitch / scramble text ---------- */
  const GLYPHS = '!<>-_\\/[]{}=+*^?#________';

  function scramble(el) {
    if (el.dataset.glitching) return;
    const original = el.dataset.text || el.textContent;
    el.dataset.text = original;
    el.dataset.glitching = '1';
    el.classList.add('is-glitching');

    const duration = 420;
    const start = performance.now();

    const frame = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const solved = Math.floor(original.length * p);
      let out = original.slice(0, solved);
      for (let i = solved; i < original.length; i++) {
        out += original[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = original;
        el.classList.remove('is-glitching');
        delete el.dataset.glitching;
      }
    };
    requestAnimationFrame(frame);
  }

  // Social links + left-nav links glitch on hover
  document.querySelectorAll('[data-glitch]').forEach((el) => {
    el.addEventListener('mouseenter', () => scramble(el));
  });
  // Tabs glitch their label on hover
  document.querySelectorAll('.tab').forEach((tab) => {
    const label = tab.querySelector('[data-glitch-label]');
    if (label) tab.addEventListener('mouseenter', () => scramble(label));
  });

  /* ---------- Tabs ---------- */
  const tabs = document.querySelectorAll('[data-tab-btn]');
  const panels = document.querySelectorAll('[data-tab-panel]');

  function setTab(name, animate = true) {
    tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tabBtn === name));
    panels.forEach((p) => {
      const on = p.dataset.tabPanel === name;
      p.classList.toggle('is-active', on);
      if (on && animate && window.gsap) {
        window.gsap.fromTo(p, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' });
      }
    });
    // Reset panel scroll + recalc scroll-triggered animations
    if (mqDesktop.matches && window.__lenis) window.__lenis.scrollTo(0, { immediate: true });
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
  }

  tabs.forEach((t) => t.addEventListener('click', () => setTab(t.dataset.tabBtn)));

  // Hero buttons / left-column links jump to a tab on desktop
  document.querySelectorAll('[data-goto-tab]').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (mqDesktop.matches) {
        e.preventDefault();
        setTab(a.dataset.gotoTab);
      }
    });
  });
})();
