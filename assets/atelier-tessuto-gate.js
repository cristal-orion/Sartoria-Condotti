/* ============================================================
   Atelier del Tessuto — selettore stagione
   La scelta Estate/Inverno rivela il configuratore corrispondente
   sulla stessa pagina (nessuna navigazione).
   Lo scroll NON e' piu' bloccato: sotto le foto ci sono una fascia
   di respiro e il footer, e i tessuti restano comunque fuori
   portata finche' non si scegle (partono hidden).
   ============================================================ */
(function () {
  'use strict';

  function initGate(gate) {
    if (gate.dataset.atGateInit === '1') return;
    gate.dataset.atGateInit = '1';

    var root = gate.closest('.bp') || document;
    var buttons = Array.prototype.slice.call(gate.querySelectorAll('[data-at-season-choice]'));
    var contents = Array.prototype.slice.call(root.querySelectorAll('[data-at-season-content]'));
    if (!buttons.length || !contents.length) return;

    function closeGate() {
      gate.classList.add('at-gate--closing');
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        gate.hidden = true;
      }
      gate.addEventListener('transitionend', finish, { once: true });
      setTimeout(finish, 600);
    }

    function choose(season) {
      contents.forEach(function (c) {
        c.hidden = c.getAttribute('data-at-season-content') !== season;
      });
      closeGate();
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        choose(btn.getAttribute('data-at-season-choice'));
      });
    });

    contents.forEach(function (content) {
      var back = content.querySelector('[data-at-season-back]');
      if (!back) return;
      back.addEventListener('click', function () {
        contents.forEach(function (c) {
          c.hidden = true;
        });
        gate.hidden = false;
        gate.classList.remove('at-gate--closing');
        window.scrollTo({ top: 0, behavior: 'auto' });
      });
    });
  }

  function boot() {
    document.querySelectorAll('[data-at-gate]').forEach(initGate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', function (e) {
    e.target.querySelectorAll('[data-at-gate]').forEach(initGate);
  });
})();
