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
 * Tre elementi:
 *   <wishlist-button data-handle="...">  il cuore (scheda prodotto e griglie)
 *   <wishlist-count>                     il contatore nell'header
 *   <wishlist-list>                      la pagina "I tuoi preferiti"
 */

const STORAGE_KEY = 'sc:wishlist:v1';
const CHANGE_EVENT = 'wishlist:change';

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
      toggle(this.handle);
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

if (!customElements.get('wishlist-button')) customElements.define('wishlist-button', WishlistButton);
if (!customElements.get('wishlist-count')) customElements.define('wishlist-count', WishlistCount);
if (!customElements.get('wishlist-list')) customElements.define('wishlist-list', WishlistList);
