/* ============================================================
   Atelier dei Tessuti — Sarto a Domicilio
   Tab Abiti/Camicie (pattern WAI-ARIA tabs) + scelta campione:
   il capo nello stage cambia con crossfade a doppio buffer e la
   scheda tecnica segue. I capi si caricano solo quando servono.
   Senza JS resta visibile il primo capo con la sua scheda.
   ============================================================ */
(function () {
  'use strict';

  function initAtelier(root) {
    if (root.dataset.atInit === '1') return;
    root.dataset.atInit = '1';

    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-at-tab]'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('[data-at-panel]'));

    function activateTab(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p) {
        p.hidden = p.getAttribute('data-at-panel') !== tab.getAttribute('data-at-tab');
      });
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        activateTab(tab, false);
      });
      tab.addEventListener('keydown', function (e) {
        var idx = -1;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') idx = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') idx = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') idx = 0;
        else if (e.key === 'End') idx = tabs.length - 1;
        if (idx < 0) return;
        e.preventDefault();
        activateTab(tabs[idx], true);
      });
    });

    panels.forEach(initPanel);
    initLightbox(root);
  }

  // --- Lightbox: ingrandimento delle foto di dettaglio (tipologie, colletti, pence...) ---
  function initLightbox(root) {
    // Cerca nell'intero documento: [data-bp-atelier] puo' stare a profondita' diverse
    // rispetto a [data-at-lightbox] a seconda della sezione (es. Atelier del Tessuto
    // annida l'atelier dentro un wrapper di stagione).
    var lightbox = document.querySelector('[data-at-lightbox]');
    var triggers = Array.prototype.slice.call(root.querySelectorAll('[data-at-zoom]'));
    if (!lightbox || !triggers.length) return;

    // Spostata a fine <body>: da dentro [data-reveal] erediterebbe il transform
    // che GSAP lascia sull'elemento dopo l'animazione, rompendo il position:fixed.
    document.body.appendChild(lightbox);

    var img = lightbox.querySelector('[data-at-lightbox-img]');
    var closeBtn = lightbox.querySelector('[data-at-lightbox-close]');
    var lastTrigger = null;

    function open(trigger) {
      lastTrigger = trigger;
      img.src = trigger.getAttribute('data-zoom-src') || '';
      img.alt = trigger.getAttribute('data-zoom-alt') || '';
      lightbox.hidden = false;
      void lightbox.offsetWidth; // forza il reflow: senza, la transizione di apertura non parte
      lightbox.classList.add('is-open');
      closeBtn.focus();
    }

    function close() {
      if (!lightbox.classList.contains('is-open')) return;
      lightbox.classList.remove('is-open');
      lightbox.addEventListener(
        'transitionend',
        function () {
          lightbox.hidden = true;
          img.src = '';
        },
        { once: true }
      );
      if (lastTrigger) lastTrigger.focus();
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener('click', function () {
        open(trigger);
      });
    });

    closeBtn.addEventListener('click', close);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
    });
  }

  function initPanel(panel) {
    var stage = panel.querySelector('[data-at-stage]');
    var imgs = stage ? stage.querySelectorAll('.bp-atelier__img') : [];
    var swatches = Array.prototype.slice.call(panel.querySelectorAll('[data-at-swatch]'));
    var cards = Array.prototype.slice.call(panel.querySelectorAll('[data-at-card]'));
    if (!stage || imgs.length < 2 || !swatches.length) return;

    var current = 0; // indice del buffer attivo nello stage
    var token = 0; // invalida gli swap in volo quando l'utente riclicca

    function showCard(key) {
      cards.forEach(function (c) {
        c.classList.toggle('is-active', c.getAttribute('data-at-card') === key);
      });
    }

    function select(swatch) {
      if (swatch.getAttribute('aria-pressed') === 'true') return;
      swatches.forEach(function (s) {
        s.setAttribute('aria-pressed', s === swatch ? 'true' : 'false');
      });
      showCard(swatch.getAttribute('data-at-swatch'));

      var myToken = ++token;
      var next = imgs[1 - current];
      var src = swatch.getAttribute('data-capo');
      var done = false;

      function swap() {
        if (done || myToken !== token) return;
        done = true;
        var prev = imgs[current];
        next.classList.add('is-active');
        next.removeAttribute('aria-hidden');
        prev.classList.remove('is-active');
        prev.setAttribute('aria-hidden', 'true');
        current = 1 - current;
      }

      next.alt = swatch.getAttribute('data-alt') || '';
      if (next.getAttribute('src') === src) {
        swap();
        return;
      }
      next.src = src;
      if (next.decode) {
        next.decode().then(swap, swap);
      } else {
        next.addEventListener('load', swap, { once: true });
      }
      // Rete lenta o decode mai risolto: swap comunque (l'img appare quando pronta)
      setTimeout(swap, 3000);
    }

    swatches.forEach(function (swatch) {
      swatch.addEventListener('click', function () {
        select(swatch);
      });
      // Preload soft: il capo si scarica appena l'utente mostra interesse
      function preload() {
        var src = swatch.getAttribute('data-capo');
        if (!src || swatch.dataset.atPre === '1') return;
        swatch.dataset.atPre = '1';
        var im = new Image();
        im.src = src;
      }
      swatch.addEventListener('pointerenter', preload);
      swatch.addEventListener('focus', preload);
    });
  }

  /* --- Anteprima dell'Atelier del Tessuto dentro Sarto a Domicilio ---
     Rifa' in piccolo il gesto della pagina vera (campione scelto -> capo che ne
     nasce) ciclando da sola le coppie di foto. Gira solo quando e' a schermo e a
     scheda attiva; con prefers-reduced-motion resta fermo il primo capo. */
  function initTeaser(root) {
    if (root.dataset.bpTeaserInit === '1') return;
    root.dataset.bpTeaserInit = '1';

    var capi = Array.prototype.slice.call(root.querySelectorAll('[data-bp-teaser-capo]'));
    var swatches = Array.prototype.slice.call(root.querySelectorAll('[data-bp-teaser-swatch]'));
    var caption = root.querySelector('[data-bp-teaser-caption]');
    if (capi.length < 2) return;

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var idx = 0;
    var timer = null;
    var onScreen = false;

    function show(n) {
      idx = (n + capi.length) % capi.length;
      capi.forEach(function (img, k) {
        img.classList.toggle('is-active', k === idx);
      });
      swatches.forEach(function (b, k) {
        var on = k === idx;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      if (caption) caption.textContent = capi[idx].getAttribute('data-nome') || '';
    }

    function stop() {
      if (!timer) return;
      window.clearInterval(timer);
      timer = null;
    }

    function play() {
      if (timer || reduce) return;
      timer = window.setInterval(function () {
        show(idx + 1);
      }, 2600);
    }

    // Il clic su un campione porta al suo capo: l'anteprima riparte da lì
    swatches.forEach(function (btn, k) {
      btn.addEventListener('click', function () {
        stop();
        show(k);
        if (onScreen && !document.hidden) play();
      });
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          onScreen = entry.isIntersecting;
          if (onScreen && !document.hidden) play();
          else stop();
        });
      }, { threshold: 0.3 }).observe(root);
    } else {
      onScreen = true;
      play();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else if (onScreen) play();
    });
  }

  function boot() {
    document.querySelectorAll('[data-bp-atelier]').forEach(initAtelier);
    document.querySelectorAll('[data-bp-teaser]').forEach(initTeaser);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  // Re-init nel theme editor di Shopify quando la sezione viene ricaricata
  document.addEventListener('shopify:section:load', function (e) {
    e.target.querySelectorAll('[data-bp-atelier]').forEach(initAtelier);
    e.target.querySelectorAll('[data-bp-teaser]').forEach(initTeaser);
  });
})();
