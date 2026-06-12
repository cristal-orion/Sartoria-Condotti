/* ============================================================
   Brand Page — animazioni condivise (GSAP + ScrollTrigger)
   Reveal progressivo + parallax hero. Degrada con grazia:
   se GSAP non c'è o reduced-motion, tutto resta visibile.
   ============================================================ */
(function () {
  'use strict';

  function initRoot(root) {
    if (root.dataset.bpInit === '1') return;
    root.dataset.bpInit = '1';

    var reduce =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var hasGSAP = typeof window.gsap !== 'undefined';

    if (reduce || !hasGSAP) {
      root.classList.add('no-anim');
      return;
    }

    var gsap = window.gsap;
    if (window.ScrollTrigger) {
      gsap.registerPlugin(window.ScrollTrigger);
    }

    root.classList.add('is-ready');

    // Reveal a gruppi: ogni [data-reveal] sale e sfuma all'ingresso
    var items = root.querySelectorAll('[data-reveal]');
    items.forEach(function (el) {
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 1.05,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 86%',
          once: true,
        },
      });
    });

    // Parallax leggero sull'immagine hero
    var heroMedia = root.querySelector('.bp__hero-media');
    var hero = root.querySelector('.bp__hero');
    if (heroMedia && hero && window.ScrollTrigger) {
      gsap.to(heroMedia, {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: {
          trigger: hero,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    }
  }

  function boot() {
    document.querySelectorAll('[data-bp-root]').forEach(initRoot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Re-init nel theme editor di Shopify quando una sezione viene ricaricata
  document.addEventListener('shopify:section:load', function (e) {
    var root = e.target.querySelector('[data-bp-root]');
    if (root) initRoot(root);
  });
})();
