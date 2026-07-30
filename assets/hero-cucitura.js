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
    const cta = root.querySelector('[data-hc-cta]');
    const ctaBtn = root.querySelector('[data-hc-cta-btn]');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);

    // L'header sta sopra la hero. Finché l'anta superiore lo copre, sotto c'è il
    // blu notte e "Menu", lingua e icone vanno scritti in bianco (ci pensa il CSS
    // in sections/header.liquid, legato a questo attributo); appena l'anta scorre
    // via sotto c'è la foto chiara e devono tornare scuri. Il confronto è
    // geometrico — niente soglie inventate sulla percentuale di animazione — e
    // cambia a metà header, il punto in cui il bianco smette di convenire.
    const doc = document.documentElement;
    function syncHeaderOverHero() {
      const header = document.getElementById('header-component');
      if (!header || !top) return;
      const bar = header.getBoundingClientRect();
      const panel = top.getBoundingClientRect();
      doc.toggleAttribute('data-hero-over-header', bar.bottom > 0 && panel.bottom >= (bar.top + bar.bottom) / 2);
    }

    let toneQueued = false;
    const queueHeaderTone = () => {
      if (toneQueued) return;
      toneQueued = true;
      requestAnimationFrame(() => {
        toneQueued = false;
        syncHeaderOverHero();
      });
    };
    window.addEventListener('scroll', queueHeaderTone, { passive: true });
    window.addEventListener('resize', queueHeaderTone);
    queueHeaderTone();

    if (reduced) {
      gsap.set(top, { yPercent: -100 });
      gsap.set(bot, { yPercent: 100 });
      if (stitch) gsap.set(stitch, { opacity: 0 });
      if (cta) gsap.set(cta, { autoAlpha: 1 });
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
      const CTA = 0.3; // fade-in del CTA subito dopo l'apertura
      const HOLD = 0.4; // pausa a CTA visibile prima di sganciare il pin
      const total = OPEN + CTA + HOLD;

      if (cta) gsap.set(cta, { autoAlpha: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: () => '+=' + Math.round(window.innerHeight * endFactor),
          pin: viewport,
          pinSpacing: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: syncHeaderOverHero,
          onRefresh: syncHeaderOverHero,
        },
      });
      tl.to(top, { yPercent: -100, ease: 'none', duration: OPEN }, 0)
        .to(bot, { yPercent: 100, ease: 'none', duration: OPEN }, 0)
        .to(stitch, { opacity: 0, ease: 'power1.out', duration: OPEN }, 0);
      if (cta) {
        // compare solo dopo che i pannelli sono completamente aperti
        tl.to(cta, { autoAlpha: 1, ease: 'power1.out', duration: CTA }, OPEN);
      }
      tl.to({}, { duration: HOLD }, OPEN + CTA); // hold: foto + CTA visibili, hero ferma

      activeST = tl.scrollTrigger;
      // clic sulla hero: apre i pannelli E mostra il CTA, lasciando l'hold come margine
      openProgress = (OPEN + CTA) / total;
      return () => {
        if (activeST === tl.scrollTrigger) activeST = null;
      };
    }

    mm.add('(min-width: 750px)', () => buildTimeline(2.3));
    mm.add('(max-width: 749px)', () => buildTimeline(1.7));

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

    // Scroll morbido programmatico (via GSAP, non CSS scroll-behavior che
    // romperebbe il pin ScrollTrigger).
    function gsapScrollTo(y) {
      const proxy = { y: window.scrollY };
      gsap.to(proxy, {
        y: Math.max(0, y),
        duration: 1.0,
        ease: 'power2.inOut',
        overwrite: true,
        onUpdate: () => window.scrollTo(0, proxy.y),
      });
    }

    // Scrolla a un elemento tenendo conto dell'header sticky.
    function scrollToEl(el) {
      const header = document.getElementById('header-component');
      const offset = header ? header.getBoundingClientRect().height : 0;
      gsapScrollTo(window.scrollY + el.getBoundingClientRect().top - offset - 8);
    }

    // Trova la sezione "scelta dei brand" (intro + griglia delle 4 card) che
    // segue la hero. Strategie a cascata, dalla più precisa alla più generica.
    function findBrandChoice() {
      // 1) sezioni del template JSON: l'id del wrapper termina con __intro_brands / __brand_grid
      const byId =
        document.querySelector('[id$="__intro_brands"]') ||
        document.querySelector('[id$="__brand_grid"]');
      if (byId) return byId;
      // 2) prima sezione dopo la hero che contiene un link a una pagina brand
      const heroSection = root.closest('.shopify-section') || root;
      const brandLink =
        'a[href*="/pages/sartoria-condotti"],' +
        'a[href*="/pages/condotti-co"],' +
        'a[href*="/pages/ricameria"],' +
        'a[href*="/pages/sarto-a-domicilio"]';
      let sib = heroSection.nextElementSibling;
      while (sib) {
        if (sib.querySelector && sib.querySelector(brandLink)) return sib;
        sib = sib.nextElementSibling;
      }
      // 3) fallback: la sezione subito dopo la hero
      return heroSection.nextElementSibling || null;
    }

    // Bottone del CTA: URL vero → naviga; '#id' → scorre a quell'ancora;
    // '#'/vuoto → scorre alla sezione "scelta dei brand" sotto la hero.
    if (ctaBtn) {
      ctaBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // non far scattare l'apertura al clic sulla hero
        const href = (ctaBtn.getAttribute('href') || '').trim();
        if (href && href !== '#') {
          if (href.charAt(0) === '#') {
            const tgt = document.querySelector(href);
            if (tgt) {
              e.preventDefault();
              scrollToEl(tgt);
            }
          }
          return; // URL vero → navigazione normale del browser
        }
        e.preventDefault();
        const choice = findBrandChoice();
        if (choice) {
          scrollToEl(choice);
        } else {
          gsapScrollTo(activeST ? activeST.end + 2 : window.scrollY + window.innerHeight);
        }
      });
    }
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
