/* ============================================================
   Atelier del Tessuto — selettore stagione bloccante
   Finche' l'utente non sceglie Estate/Inverno lo scroll resta
   bloccato sul selettore. La scelta rivela il configuratore
   corrispondente sulla stessa pagina (nessuna navigazione).
   ============================================================ */
(function () {
  'use strict';

  function lockScroll(lock) {
    document.documentElement.classList.toggle('at-locked', lock);
    document.body.classList.toggle('at-locked', lock);
  }

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
      lockScroll(false);
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
        lockScroll(true);
        window.scrollTo({ top: 0, behavior: 'auto' });
      });
    });

    lockScroll(true);
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
