(function () {
  function whenReady(cb) {
    if (window.gsap && window.ScrollTrigger) return cb();
    let tries = 0;
    const id = setInterval(() => {
      if (window.gsap && window.ScrollTrigger) {
        clearInterval(id);
        cb();
      } else if (++tries > 200) {
        clearInterval(id);
      }
    }, 25);
  }

  function setupOne(root) {
    if (root.dataset.hcInit) return;
    root.dataset.hcInit = '1';

    const top = root.querySelector('[data-hc-top]');
    const bot = root.querySelector('[data-hc-bot]');
    const stitch = root.querySelector('[data-hc-stitch]');
    const viewport = root.querySelector('.hero-cucitura__viewport');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);

    if (reduced) {
      gsap.set(top, { yPercent: -100 });
      gsap.set(bot, { yPercent: 100 });
      if (stitch) gsap.set(stitch, { opacity: 0 });
      return;
    }

    const mm = gsap.matchMedia();

    // ScrollTrigger attivo per il breakpoint corrente (lo usa l'apertura al clic).
    let activeST = null;

    function buildTimeline(endFactor) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: () => '+=' + Math.round(window.innerHeight * endFactor),
          pin: viewport,
          pinSpacing: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      tl.to(top, { yPercent: -100, ease: 'none' }, 0)
        .to(bot, { yPercent: 100, ease: 'none' }, 0)
        .to(stitch, { opacity: 0, ease: 'power1.out' }, 0);

      activeST = tl.scrollTrigger;
      return () => {
        if (activeST === tl.scrollTrigger) activeST = null;
      };
    }

    mm.add('(min-width: 750px)', () => buildTimeline(1.4));
    mm.add('(max-width: 749px)', () => buildTimeline(1.0));

    // Apertura "a sipario" anche con un semplice clic sulla hero:
    // scorre dolcemente fino a fine range pinnato, così l'animazione scrub
    // si apre da sola restando sincronizzata con ScrollTrigger.
    let opening = false;
    const openOnClick = () => {
      if (!activeST || opening) return;
      const targetY = activeST.end;
      if (Math.abs(window.scrollY - targetY) < 2) return;
      opening = true;
      const proxy = { y: window.scrollY };
      gsap.to(proxy, {
        y: targetY,
        duration: 1.1,
        ease: 'power2.inOut',
        overwrite: true,
        onUpdate: () => window.scrollTo(0, proxy.y),
        onComplete: () => {
          opening = false;
        },
      });
    };
    if (viewport) viewport.addEventListener('click', openOnClick);
  }

  function init() {
    document.querySelectorAll('[data-hc-root]').forEach(setupOne);
    const header = document.getElementById('header-component');
    if (header && window.ResizeObserver) {
      const ro = new ResizeObserver(() => window.ScrollTrigger && window.ScrollTrigger.refresh());
      ro.observe(header);
    }
  }

  function boot() {
    whenReady(() => {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
      } else {
        init();
      }
    });
  }

  boot();

  document.addEventListener('shopify:section:load', (e) => {
    const root = e.target.querySelector('[data-hc-root]');
    if (root) {
      delete root.dataset.hcInit;
      whenReady(() => setupOne(root));
    }
  });
})();
