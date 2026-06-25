/* ============================================================
   Brand Page — comportamenti condivisi
   1) Reveal progressivo + parallax hero (richiede GSAP)
   2) Scroll orizzontale della striscia foto: rotellina + drag
      (indipendente da GSAP, funziona sempre)
   Degrada con grazia: se GSAP non c'è o reduced-motion,
   le animazioni si spengono ma lo scroll della gallery resta.
   ============================================================ */
(function () {
  'use strict';

  // --- Reveal + parallax (richiede GSAP) ---
  function initAnim(root) {
    if (root.dataset.bpAnim === '1') return;
    root.dataset.bpAnim = '1';

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

  // --- Scroll orizzontale della striscia foto (rotellina + drag) ---
  function initGallery(track) {
    if (track.dataset.bpScroll === '1') return;
    track.dataset.bpScroll = '1';

    // Rotellina verticale del mouse → scroll orizzontale.
    // Solo finché c'è spazio: ai bordi lascia scorrere la pagina.
    track.addEventListener(
      'wheel',
      function (e) {
        // Gesto orizzontale del trackpad: lo gestisce già il browser
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        var atStart = track.scrollLeft <= 0;
        var atEnd =
          track.scrollLeft + track.clientWidth >= track.scrollWidth - 1;
        if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return;
        e.preventDefault();
        track.scrollLeft += e.deltaY;
      },
      { passive: false }
    );

    // Trascinamento col mouse → scroll orizzontale, senza attivare i link
    var down = false;
    var moved = false;
    var startX = 0;
    var startScroll = 0;

    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return; // touch: scroll nativo
      down = true;
      moved = false;
      startX = e.clientX;
      startScroll = track.scrollLeft;
    });

    track.addEventListener('pointermove', function (e) {
      if (!down) return;
      var dx = e.clientX - startX;
      // Attiva il drag (cursore + pointer capture) SOLO oltre la soglia: così
      // un semplice click NON cattura il pointer e il link naviga normalmente.
      // (setPointerCapture su pointerdown sopprimeva il click su desktop.)
      if (!moved && Math.abs(dx) > 4) {
        moved = true;
        track.classList.add('is-dragging');
        try {
          track.setPointerCapture(e.pointerId);
        } catch (err) {}
      }
      if (moved) track.scrollLeft = startScroll - dx;
    });

    function endDrag(e) {
      if (!down) return;
      down = false;
      track.classList.remove('is-dragging');
      try {
        track.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    // Se l'utente ha trascinato, annulla il click sul link (no navigazione)
    track.addEventListener(
      'click',
      function (e) {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
          moved = false;
        }
      },
      true
    );

    // Evita il "drag fantasma" dell'immagine del browser
    track.addEventListener('dragstart', function (e) {
      e.preventDefault();
    });
  }

  function boot() {
    document.querySelectorAll('[data-bp-root]').forEach(initAnim);
    document.querySelectorAll('.bp-gallery__track').forEach(initGallery);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Re-init nel theme editor di Shopify quando una sezione viene ricaricata
  document.addEventListener('shopify:section:load', function (e) {
    var root = e.target.querySelector('[data-bp-root]');
    if (root) initAnim(root);
    e.target.querySelectorAll('.bp-gallery__track').forEach(initGallery);
  });
})();
