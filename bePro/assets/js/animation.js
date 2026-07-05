document.addEventListener("DOMContentLoaded", function () {
  // =========================
  // Typing Effect
  // =========================
  class TypingEffect {
    constructor(el, opts) {
      this.el = el;
      this.words = opts.words || [];
      this.typeDelay = opts.typeDelay;
      this.eraseDelay = opts.eraseDelay;
      this.pauseDelay = opts.pauseDelay;
      this.loop = opts.loop;
      this.cursor = this._ensureCursor();
      this.wordIndex = 0;
      this.charIndex = 0;
      this._stopped = false;
    }
    _ensureCursor() {
      const next = this.el.nextElementSibling;
      if (next && next.classList.contains("al-animate-cursor")) return next;
      const span = document.createElement("span");
      span.className = "al-animate-cursor";
      span.setAttribute("aria-hidden", "true");
      this.el.after(span);
      return span;
    }
    _setTyping(on) {
      this.cursor?.classList.toggle("al-typing", !!on);
    }
    start() {
      if (!this.words.length) return;
      this.el.textContent = "";
      this._stopped = false;
      setTimeout(() => this._type(), this.pauseDelay + 250);
    }
    _type() {
      if (this._stopped) return;
      const current = this.words[this.wordIndex] || "";
      if (this.charIndex < current.length) {
        this._setTyping(true);
        this.el.textContent += current.charAt(this.charIndex++);
        setTimeout(() => this._type(), this.typeDelay);
      } else {
        this._setTyping(false);
        setTimeout(() => this._erase(), this.pauseDelay);
      }
    }
    _erase() {
      if (this._stopped) return;
      if (this.charIndex > 0) {
        this._setTyping(true);
        const current = this.words[this.wordIndex] || "";
        this.el.textContent = current.substring(0, this.charIndex - 1);
        this.charIndex--;
        setTimeout(() => this._erase(), this.eraseDelay);
      } else {
        this._setTyping(false);
        this.wordIndex++;
        if (this.wordIndex >= this.words.length) {
          if (this.loop) this.wordIndex = 0;
          else return;
        }
        setTimeout(() => this._type(), this.typeDelay + 1100);
      }
    }
  }

  // Read options from CSS variables; defaults if not set
  function _beReadOpts(el) {
    const cs = window.getComputedStyle(el);
    const num = (v, f) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : f;
    };
    let wordSpans = [];
    try {
      wordSpans = el.querySelectorAll(":scope > span");
    } catch {
      wordSpans = el.children;
    }
    return {
      words: Array.from(wordSpans)
        .map((s) => s.textContent.trim())
        .filter(Boolean),
      typeDelay: num(cs.getPropertyValue("--type-delay"), 200),
      eraseDelay: num(cs.getPropertyValue("--erase-delay"), 100),
      pauseDelay: num(cs.getPropertyValue("--pause-delay"), 2000),
      loop: num(cs.getPropertyValue("--loop"), 1) !== 0,
    };
  }

  // Auto-init all instances on the page
  document.querySelectorAll(".al-typed-text").forEach((el) => {
    const opts = _beReadOpts(el);
    if (!opts.words.length) return;
    const typer = new TypingEffect(el, opts);
    el._typingInstance = typer; // optional access
    typer.start();
  });

  // =========================
  // On-scroll animations (Waypoints -> fallback to IntersectionObserver)
  // =========================
  const animated = document.querySelectorAll(".animate__animated");

  animated.forEach((el) => {
    const animClass = Array.from(el.classList).find(
      (c) => c.startsWith("animate__") && c !== "animate__animated"
    );
    if (!animClass) return;

    el.classList.remove(animClass);
    el.style.opacity = 0;

    if (window.Waypoint) {
      // Use Waypoints if present
      new Waypoint({
        element: el,
        handler: function () {
          el.classList.add(animClass);
          el.style.opacity = 1;
          this.destroy();
        },
        offset: "100%",
      });
    } else if ("IntersectionObserver" in window) {
      // Fallback: IntersectionObserver (no jQuery)
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              el.classList.add(animClass);
              el.style.opacity = 1;
              obs.unobserve(el);
            }
          });
        },
        { root: null, rootMargin: "0px", threshold: 0.01 }
      );
      io.observe(el);
    } else {
      // Last resort: simple scroll check
      const onScroll = () => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add(animClass);
          el.style.opacity = 1;
          window.removeEventListener("scroll", onScroll);
        }
      };
      window.addEventListener("scroll", onScroll);
      onScroll();
    }
  });

  
  // =========================
  // Mouse Effects JS
  // =========================
  (() => {
    const lerp = (a, b, t) => a + (b - a) * t;

    // --- Custom cursor ---
    (function cursor() {
      const cursor = document.querySelector(".al-cursor");
      const dot = document.querySelector(".al-cursor-dot");
      if (!cursor || !dot) return;
      const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
      let fx = mouse.x,
        fy = mouse.y;

      window.addEventListener(
        "mousemove",
        (e) => {
          mouse.x = e.clientX;
          mouse.y = e.clientY;
        },
        { passive: true }
      );
      window.addEventListener("mouseleave", () => {
        cursor.style.opacity = 0;
        dot.style.opacity = 0;
      });
      window.addEventListener("mouseenter", () => {
        cursor.style.opacity = 0.4;
        dot.style.opacity = 0.7;
      });

      (function tick() {
        fx = lerp(fx, mouse.x, 0.18);
        fy = lerp(fy, mouse.y, 0.18);
        cursor.style.transform = `translate(${fx}px, ${fy}px)`;
        dot.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
        requestAnimationFrame(tick);
      })();
    })();

    // --- Magnetic ---
    (function magnets() {
      const els = Array.from(document.querySelectorAll(".al-magnet"));
      if (!els.length) return;
      const state = { mx: 0, my: 0, ticking: false };

      function updateAll() {
        state.ticking = false;
        els.forEach((el) => {
          if (el.classList.contains("al-magnet--static")) {
            el.style.transform = "";
            return;
          }
          const css = getComputedStyle(el);
          const R = +css.getPropertyValue("--al-pull-radius") || 120;
          const S = +css.getPropertyValue("--al-pull-strength") || 0.25;
          const MAX = +css.getPropertyValue("--al-max-translate") || 18;
          const r = el.getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const dx = state.mx - cx;
          const dy = state.my - cy;
          const d = Math.hypot(dx, dy);
          if (d < R) {
            const p = (1 - d / R) * S;
            let tx = dx * p,
              ty = dy * p;
            const td = Math.hypot(tx, ty);
            if (td > MAX) {
              const s = MAX / td;
              tx *= s;
              ty *= s;
            }
            el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(
              2
            )}px)`;
          } else {
            el.style.transform = "translate(0,0)";
          }
        });
      }

      function onMove(e) {
        state.mx = e.clientX;
        state.my = e.clientY;
        if (!state.ticking) {
          state.ticking = true;
          requestAnimationFrame(updateAll);
        }
      }
      function onLeave() {
        els.forEach((el) => (el.style.transform = ""));
      }

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerleave", onLeave, { passive: true });
    })();

    (function ripples() {
      function spawn(e) {
        const host = e.currentTarget.querySelector(".al-on-click-ripple");
        if (!host) return;

        const span = document.createElement("span");
        const rect = host.getBoundingClientRect();
        span.style.left = (e.clientX - rect.left) + "px";
        span.style.top  = (e.clientY - rect.top)  + "px";
        host.appendChild(span);

        span.addEventListener("animationend", () => span.remove());
      }

      // Bind to all elements that contain a ripple host
      document.querySelectorAll(".al-on-click-ripple").forEach((host) => {
        const parent = host.parentElement;
        if (parent) parent.addEventListener("click", spawn);
      });
    })();
    
  })();


});


  