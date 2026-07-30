/**
 * Lista dei desideri "leggera" (punto 5 del documento cliente).
 *
 * Salvata nel browser (localStorage): nessun login richiesto, nessuna app, zero
 * costi ricorrenti. Il prezzo di questa scelta è che NON si sincronizza fra
 * telefono e computer — deciso col cliente, da rivedere se i dati diranno che
 * viene usata molto.
 *
 * Salviamo solo gli handle dei prodotti, non titoli e prezzi: le schede della
 * pagina preferiti vengono chieste al server (sezione `wishlist-card`), così
 * prezzi, sconti e foto sono sempre quelli veri e non una copia che invecchia.
 *
 * Quattro elementi:
 *   <wishlist-button data-handle="...">  il cuore (scheda prodotto e griglie)
 *   <wishlist-count>                     il contatore nell'header
 *   <wishlist-list>                      la pagina "I tuoi preferiti"
 *   <wishlist-signup>                    l'invito a iscriversi al primo salvataggio
 */

const STORAGE_KEY = 'sc:wishlist:v1';
const CHANGE_EVENT = 'wishlist:change';
const ADD_EVENT = 'wishlist:add';

/** @returns {string[]} gli handle salvati, dal più recente */
function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((h) => typeof h === 'string' && h) : [];
  } catch {
    // localStorage può lanciare (Safari in navigazione privata, quota piena):
    // la lista degenera a "vuota" invece di rompere la pagina.
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* se non possiamo salvare, l'interfaccia resta comunque coerente in pagina */
  }
  document.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { list } }));
}

function toggle(handle) {
  const list = read();
  const at = list.indexOf(handle);
  if (at >= 0) list.splice(at, 1);
  else list.unshift(handle);
  write(list);
  return at < 0;
}

/** Radice con prefisso lingua (/, /en/, /fr/…), per non perdere la traduzione. */
function rootUrl() {
  const root = window.Shopify?.routes?.root || '/';
  return root.endsWith('/') ? root : `${root}/`;
}

class WishlistButton extends HTMLElement {
  connectedCallback() {
    this.handle = this.dataset.handle;
    this.button = this.querySelector('button');
    if (!this.handle || !this.button) return;

    this.onClick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      // Solo l'aggiunta è un evento a sé: è l'unico momento in cui ha senso
      // proporre l'iscrizione (vedi <wishlist-signup>).
      if (toggle(this.handle)) {
        document.dispatchEvent(new CustomEvent(ADD_EVENT, { detail: { handle: this.handle } }));
      }
    };
    this.onChange = () => this.sync();

    this.button.addEventListener('click', this.onClick);
    document.addEventListener(CHANGE_EVENT, this.onChange);
    window.addEventListener('storage', this.onChange);
    this.sync();
  }

  disconnectedCallback() {
    this.button?.removeEventListener('click', this.onClick);
    document.removeEventListener(CHANGE_EVENT, this.onChange);
    window.removeEventListener('storage', this.onChange);
  }

  sync() {
    const saved = read().includes(this.handle);
    this.dataset.saved = String(saved);
    this.button.setAttribute('aria-pressed', String(saved));
    const label = saved ? this.button.dataset.labelSaved : this.button.dataset.labelAdd;
    if (label) this.button.setAttribute('aria-label', label);
    const text = this.querySelector('[data-wishlist-text]');
    if (text && label) text.textContent = label;
  }
}

class WishlistCount extends HTMLElement {
  connectedCallback() {
    this.onChange = () => this.sync();
    document.addEventListener(CHANGE_EVENT, this.onChange);
    window.addEventListener('storage', this.onChange);
    this.sync();
  }

  disconnectedCallback() {
    document.removeEventListener(CHANGE_EVENT, this.onChange);
    window.removeEventListener('storage', this.onChange);
  }

  sync() {
    const n = read().length;
    this.textContent = n ? String(n) : '';
    this.hidden = n === 0;
  }
}

class WishlistList extends HTMLElement {
  connectedCallback() {
    this.grid = this.querySelector('[data-wishlist-grid]');
    this.empty = this.querySelector('[data-wishlist-empty]');
    if (!this.grid) return;
    this.shown = [];
    this.onChange = () => this.update();
    document.addEventListener(CHANGE_EVENT, this.onChange);
    window.addEventListener('storage', this.onChange);
    this.render();
  }

  disconnectedCallback() {
    document.removeEventListener(CHANGE_EVENT, this.onChange);
    window.removeEventListener('storage', this.onChange);
  }

  /** Cambio a lista già visibile: togliere una scheda non richiede una ricarica. */
  update() {
    const list = read();
    const added = list.filter((h) => !this.shown.includes(h));
    if (added.length) {
      this.render();
      return;
    }
    this.shown
      .filter((h) => !list.includes(h))
      .forEach((h) => {
        this.grid.querySelector(`[data-wishlist-item="${h}"]`)?.remove();
      });
    this.shown = this.shown.filter((h) => list.includes(h));
    this.toggleEmpty(this.shown.length === 0);
  }

  toggleEmpty(isEmpty) {
    if (this.empty) this.empty.hidden = !isEmpty;
    if (this.grid) this.grid.hidden = isEmpty;
  }

  async render() {
    const list = read();
    if (!list.length) {
      this.grid.replaceChildren();
      this.shown = [];
      this.toggleEmpty(true);
      return;
    }

    this.setAttribute('aria-busy', 'true');
    const cards = await Promise.all(list.map((handle) => this.fetchCard(handle)));

    // Un handle che non risponde più (prodotto rimosso o non pubblicato) esce
    // dalla lista: meglio perderlo che mostrare un buco o un link morto.
    const alive = [];
    this.grid.replaceChildren();
    cards.forEach((html, i) => {
      if (!html) return;
      const wrapper = document.createElement('div');
      wrapper.className = 'wishlist-grid__item';
      wrapper.dataset.wishlistItem = list[i];
      wrapper.innerHTML = html;
      this.grid.appendChild(wrapper);
      alive.push(list[i]);
    });

    if (alive.length !== list.length) write(alive);
    this.shown = alive;
    this.toggleEmpty(alive.length === 0);
    this.removeAttribute('aria-busy');
  }

  async fetchCard(handle) {
    const section = this.dataset.cardSection || 'wishlist-card';
    try {
      const res = await fetch(`${rootUrl()}products/${handle}?section_id=${section}`);
      if (!res.ok) return null;
      const text = await res.text();
      return text.trim() || null;
    } catch {
      return null;
    }
  }
}

/* ---------------------------------------------------------------------------
 * L'invito a iscriversi (snippets/wishlist-signup-modal.liquid).
 *
 * Compare al primo capo salvato: l'email in cambio del codice di benvenuto.
 * Chi chiude non perde niente — la lista resta nel browser esattamente come
 * prima — e non se lo ritrova addosso: torna al massimo altre due volte, e solo
 * dopo i giorni di attesa impostati nel tema.
 * ------------------------------------------------------------------------ */

const SIGNUP_KEY = 'sc:wishlist:signup:v1';
const SIGNUP_PENDING_KEY = 'sc:wishlist:signup:pending';
const MAX_DISMISSALS = 3;
const DAY = 24 * 60 * 60 * 1000;

/** @returns {{done: boolean, dismissed: number, at: number}} */
function readSignup() {
  try {
    const state = JSON.parse(localStorage.getItem(SIGNUP_KEY) || 'null');
    if (state && typeof state === 'object') return { done: false, dismissed: 0, at: 0, ...state };
  } catch {
    /* come per la lista: se non possiamo leggere, ripartiamo da zero */
  }
  return { done: false, dismissed: 0, at: 0 };
}

function writeSignup(state) {
  try {
    localStorage.setItem(SIGNUP_KEY, JSON.stringify(state));
  } catch {
    /* niente memoria: l'invito ricomparirà, è il male minore */
  }
}

/** Il dataLayer di GTM c'è su ogni pagina (layout/theme.liquid). */
function track(event, detail = {}) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...detail });
}

class WishlistSignup extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    this.form = this.querySelector('form');
    if (!this.dialog) return;

    this.onAdd = () => this.maybeOpen();
    this.onDialogClose = () => this.afterClose();
    this.onSubmit = () => this.submit();
    this.onBackdrop = (event) => {
      // Il click sullo sfondo ha come target il dialog stesso.
      if (event.target === this.dialog) this.dismiss();
    };
    this.onEscape = (event) => {
      if (event.key === 'Escape') this.dismiss();
    };

    document.addEventListener(ADD_EVENT, this.onAdd);
    // L'evento `close` copre la chiusura fatta dal browser; le nostre chiusure
    // passano da dismiss(). afterClose() è scritto per reggere entrambe le
    // strade senza contare due volte, così lo sblocco dello scroll non dipende
    // da un solo evento.
    this.dialog.addEventListener('close', this.onDialogClose);
    this.dialog.addEventListener('click', this.onBackdrop);
    this.dialog.addEventListener('keydown', this.onEscape);
    this.querySelectorAll('[data-wl-close]').forEach((el) => {
      el.addEventListener('click', () => this.dismiss());
    });
    this.form?.addEventListener('submit', this.onSubmit);
    this.querySelector('[data-wl-copy]')?.addEventListener('click', (event) => this.copy(event.currentTarget));

    this.restore();
  }

  disconnectedCallback() {
    document.removeEventListener(ADD_EVENT, this.onAdd);
  }

  maybeOpen() {
    if (this.dialog.open) return;
    const state = readSignup();
    if (state.done || state.dismissed >= MAX_DISMISSALS) return;

    const cooldown = Number(this.dataset.cooldownDays || 30) * DAY;
    if (state.at && Date.now() - state.at < cooldown) return;

    // Mezzo secondo: prima si vede il cuore riempirsi, poi arriva la domanda.
    window.setTimeout(() => {
      this.showPanel('form');
      this.open();
    }, 450);
  }

  open() {
    if (this.dialog.open) return;
    this.tallied = false;
    this.dialog.showModal();
    document.documentElement.setAttribute('scroll-lock', '');
    track('wishlist_signup_shown');
  }

  dismiss() {
    this.dialog.close();
    this.afterClose();
  }

  afterClose() {
    document.documentElement.removeAttribute('scroll-lock');
    // Chiusa da noi per lasciare spazio alla verifica anti-spam: non è un rifiuto.
    if (this.submitting || this.tallied) return;
    this.tallied = true;
    const state = readSignup();
    if (state.done) return;
    state.dismissed += 1;
    state.at = Date.now();
    writeSignup(state);
    track('wishlist_signup_dismissed', { wishlist_signup_dismissals: state.dismissed });
  }

  showPanel(name) {
    this.querySelectorAll('[data-wl-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.wlPanel !== name;
    });
  }

  setError(on) {
    const box = this.querySelector('[data-wl-error]');
    if (box) box.hidden = !on;
    if (on) this.querySelector('input[type="email"]')?.focus();
  }

  succeed() {
    const state = readSignup();
    state.done = true;
    state.at = Date.now();
    writeSignup(state);
    this.showPanel('success');
    track('wishlist_signup_completed');
  }

  /**
   * L'invio resta quello nativo del browser, di proposito.
   *
   * Il negozio ha la protezione anti-spam di Shopify sui form cliente: il token
   * CAPTCHA lo aggiunge uno script di Shopify agganciato all'invio nativo, e un
   * POST fatto a mano con fetch si prende un 400 "Missing CAPTCHA token".
   * Quindi lasciamo partire il form: la pagina si ricarica e restore() riapre la
   * modale sul risultato — con in mano il codice, se è andata bene.
   */
  submit() {
    this.submitting = true;
    this.setError(false);
    this.querySelector('[data-wl-submit]')?.setAttribute('aria-busy', 'true');
    try {
      sessionStorage.setItem(SIGNUP_PENDING_KEY, '1');
    } catch {
      /* senza sessionStorage si perde solo la riapertura dopo il ricaricamento */
    }

    // Di norma la pagina se ne va prima che scatti. Se invece l'anti-spam mostra
    // una verifica da fare a mano, la modale è in top layer e la coprirebbe:
    // dopo mezzo secondo si toglie di mezzo.
    window.setTimeout(() => {
      if (this.dialog.open) this.dialog.close();
    }, 800);
  }

  /** Riapertura dopo il ricaricamento: la modale torna sul risultato dell'invio. */
  restore() {
    let pending = null;
    try {
      pending = sessionStorage.getItem(SIGNUP_PENDING_KEY);
      if (pending) sessionStorage.removeItem(SIGNUP_PENDING_KEY);
    } catch {
      /* niente sessionStorage: nessuna riapertura, la pagina resta com'è */
    }
    if (!pending) return;

    if (this.querySelector('[data-wl-signup-error]')) {
      this.showPanel('form');
      this.open();
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get('customer_posted') !== 'true') return;

    params.delete('customer_posted');
    const query = params.toString();
    window.history.replaceState(
      {},
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    );
    this.succeed();
    this.open();
  }

  async copy(button) {
    const node = this.querySelector('[data-wl-code]');
    const code = node?.textContent.trim();
    if (!code || !button) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Appunti negati (permessi, http): almeno lo selezioniamo, così il codice
      // si copia a mano senza doverlo ribattere.
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }
    button.textContent = button.dataset.labelCopied || button.textContent;
    window.setTimeout(() => {
      button.textContent = button.dataset.labelCopy || '';
    }, 2000);
  }
}

if (!customElements.get('wishlist-button')) customElements.define('wishlist-button', WishlistButton);
if (!customElements.get('wishlist-count')) customElements.define('wishlist-count', WishlistCount);
if (!customElements.get('wishlist-list')) customElements.define('wishlist-list', WishlistList);
if (!customElements.get('wishlist-signup')) customElements.define('wishlist-signup', WishlistSignup);
