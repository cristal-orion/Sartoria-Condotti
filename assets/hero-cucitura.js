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

    mm.add('(min-width: 750px)', () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: () => '+=' + Math.round(window.innerHeight * 1.4),
          pin: viewport,
          pinSpacing: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      tl.to(top, { yPercent: -100, ease: 'none' }, 0)
        .to(bot, { yPercent: 100, ease: 'none' }, 0)
        .to(stitch, { opacity: 0, ease: 'power1.out' }, 0);
    });

    mm.add('(max-width: 749px)', () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: () => '+=' + Math.round(window.innerHeight * 1.0),
          pin: viewport,
          pinSpacing: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
        },
      });
      tl.to(top, { yPercent: -100, ease: 'none' }, 0)
        .to(bot, { yPercent: 100, ease: 'none' }, 0)
        .to(stitch, { opacity: 0, ease: 'power1.out' }, 0);
    });
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
