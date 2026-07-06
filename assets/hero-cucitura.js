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
    // Frazione di scroll a cui i pannelli risultano completamente aperti.
    // Il tratto restante è una pausa "hold" in cui si vede la foto per intero
    // prima che la hero scorra via.
    let openProgress = 1;

    function buildTimeline(endFactor) {
      const OPEN = 1; // durata apertura pannelli
      const HOLD = 0.4; // pausa a pannelli aperti prima di sganciare il pin
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
      tl.to(top, { yPercent: -100, ease: 'none', duration: OPEN }, 0)
        .to(bot, { yPercent: 100, ease: 'none', duration: OPEN }, 0)
        .to(stitch, { opacity: 0, ease: 'power1.out', duration: OPEN }, 0)
        .to({}, { duration: HOLD }); // hold: foto intera visibile, hero ancora ferma

      activeST = tl.scrollTrigger;
      openProgress = OPEN / (OPEN + HOLD);
      return () => {
        if (activeST === tl.scrollTrigger) activeST = null;
      };
    }

    mm.add('(min-width: 750px)', () => buildTimeline(1.9));
    mm.add('(max-width: 749px)', () => buildTimeline(1.4));

    // Apertura "a sipario" anche con un semplice clic sulla hero:
    // scorre dolcemente fino a fine range pinnato, così l'animazione scrub
    // si apre da sola restando sincronizzata con ScrollTrigger.
    let opening = false;
    const openOnClick = () => {
      if (!activeST || opening) return;
      // Porta lo scroll fino al punto in cui i pannelli sono completamente aperti
      // (inizio dell'hold): la foto si vede per intero e resta un margine sotto.
      const targetY = activeST.start + openProgress * (activeST.end - activeST.start);
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
      // Mentre un drawer/modale blocca lo scroll (html[scroll-lock]), NON
      // ricalcolare il pin: overflow:hidden può cambiare la larghezza e
      // desincronizzare la hero (freeze aprendo/chiudendo il Menu). Il refresh
      // eventualmente rimandato viene eseguito una sola volta allo sblocco.
      let pendingRefresh = false;
      const isLocked = () => document.documentElement.hasAttribute('scroll-lock');
      const refreshHero = () => {
        if (!window.ScrollTrigger) return;
        if (isLocked()) {
          pendingRefresh = true;
          return;
        }
        window.ScrollTrigger.refresh();
      };
      const ro = new ResizeObserver(refreshHero);
      ro.observe(header);

      const lockObserver = new MutationObserver(() => {
        if (!isLocked() && pendingRefresh) {
          pendingRefresh = false;
          if (window.ScrollTrigger) window.ScrollTrigger.refresh();
        }
      });
      lockObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['scroll-lock'],
      });
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
