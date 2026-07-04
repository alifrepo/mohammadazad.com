(() => {
  'use strict';
  if (!window.gsap || !window.ScrollTrigger || !window.Lenis) return;

  const gsap = window.gsap;
  gsap.registerPlugin(window.ScrollTrigger);

  const mqDesktop = window.matchMedia('(min-width: 992px)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Lenis: desktop scrolls the panel, mobile the page ---------- */
  const scrollEl = document.querySelector('.panel-scroll');
  let lenis;
  if (mqDesktop.matches && scrollEl) {
    lenis = new window.Lenis({ wrapper: scrollEl, content: scrollEl.firstElementChild, lerp: 0.1 });
    window.ScrollTrigger.defaults({ scroller: scrollEl });
  } else {
    lenis = new window.Lenis({ lerp: 0.1 });
  }
  window.__lenis = lenis;
  lenis.on('scroll', window.ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  if (reducedMotion) return; // keep smooth scroll, skip decorative motion

  /* ---------- Hero intro timeline ---------- */
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.from('[data-hero="logo"]', { y: 40, opacity: 0, filter: 'blur(12px)', duration: 0.9 })
    .from('[data-hero="line"]', { y: 56, opacity: 0, filter: 'blur(10px)', duration: 0.9, stagger: 0.12 }, '-=0.6')
    .from('[data-hero="sub"]', { y: 30, opacity: 0, duration: 0.7, stagger: 0.1 }, '-=0.5')
    .from('[data-hero="btn"]', { scale: 0.6, opacity: 0, duration: 0.55, ease: 'back.out(2.2)', stagger: 0.1 }, '-=0.4')
    .from('[data-hero-nav]', { y: -24, opacity: 0, duration: 0.7 }, '-=0.6')
    .from('[data-hero="tabs"]', { opacity: 0, y: -14, duration: 0.6 }, '-=0.5')
    .from('[data-hero="foot"]', { y: 30, opacity: 0, duration: 0.7, stagger: 0.1 }, '-=0.5')
    .from('[data-hero="marquee"]', { opacity: 0, duration: 0.7 }, '-=0.4');

  /* ---------- Cards: reveal + parallax + tilt ---------- */
  document.querySelectorAll('[data-card]').forEach((card, i) => {
    gsap.from(card, {
      y: 90, scale: 0.94, opacity: 0, rotate: i % 2 ? 1.6 : -1.6,
      duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: card, start: 'top 92%', once: true },
    });

    const media = card.querySelector('[data-parallax]');
    if (media) {
      const amt = parseFloat(media.dataset.parallax) || 10;
      gsap.fromTo(media, { yPercent: -amt / 2 }, {
        yPercent: amt / 2, ease: 'none',
        scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true },
      });
      gsap.set(media, { scale: 1.12 });
    }

    const title = card.querySelector('[data-card-title]');
    if (title) {
      gsap.from(title, { y: 18, opacity: 0, duration: 0.6, scrollTrigger: { trigger: card, start: 'top 85%', once: true } });
    }

    bindTilt(card, media);
  });

  /* ---------- Generic reveals ---------- */
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.from(el, {
      y: 36, opacity: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top bottom', once: true },
    });
  });

  /* ---------- Cursor glow ---------- */
  const glow = document.querySelector('.cursor-glow');
  if (glow) {
    const gx = gsap.quickTo(glow, 'x', { duration: 0.5, ease: 'power3' });
    const gy = gsap.quickTo(glow, 'y', { duration: 0.5, ease: 'power3' });
    window.addEventListener('mousemove', (e) => { gx(e.clientX); gy(e.clientY); }, { passive: true });
  }

  /* ---------- Magnetic buttons ---------- */
  document.querySelectorAll('[data-magnetic]').forEach((btn) => {
    const xTo = gsap.quickTo(btn, 'x', { duration: 0.4, ease: 'power3' });
    const yTo = gsap.quickTo(btn, 'y', { duration: 0.4, ease: 'power3' });
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      xTo((e.clientX - r.left - r.width / 2) * 0.35);
      yTo((e.clientY - r.top - r.height / 2) * 0.45);
    });
    btn.addEventListener('mouseleave', () => { xTo(0); yTo(0); });
  });

  /* ---------- 3D tilt + hover zoom ---------- */
  function bindTilt(card, media) {
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
    gsap.set(card, { transformPerspective: 1100 });

    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 7);
      rx(-((e.clientY - r.top) / r.height - 0.5) * 7);
    });
    card.addEventListener('mouseenter', () => {
      if (media) gsap.to(media, { scale: 1.17, duration: 0.9, ease: 'power3.out' });
    });
    card.addEventListener('mouseleave', () => {
      rx(0); ry(0);
      if (media) gsap.to(media, { scale: 1.12, duration: 0.9, ease: 'power3.out' });
    });
  }
})();
