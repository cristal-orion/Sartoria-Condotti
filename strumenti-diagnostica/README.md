# Strumenti di diagnostica

Script usati il 28 luglio 2026 per capire i punteggi PageSpeed del sito. Non
fanno parte del tema: Shopify CLI carica solo `assets/ blocks/ config/ layout/
locales/ sections/ snippets/ templates/`, quindi questa cartella viene ignorata
dai push. Stanno nel repo perché ricostruirli costa più che tenerli.

## Prerequisiti

Nessuna installazione. Serve solo:

- **Brave** (`/usr/bin/brave-browser`) — è Chromium, si pilota via DevTools
  Protocol. Va bene qualunque Chromium/Chrome: cambia il binario in `avvia_brave.sh`.
- **Node 22+** — ha `WebSocket` globale, quindi niente `npm install`.
- **Python 3 + PIL** per gli script `.py`.

## Uso

```bash
bash avvia_brave.sh                  # Brave headless in ascolto su :9222
node console.mjs <url> [secondi]     # errori in console + richieste fallite
node contrasto.mjs <url> [ms] [desktop|mobile]   # axe-core, solo contrasto
bash chiudi_brave.sh                 # chiude tutto
```

`contrasto.mjs` ha bisogno di `axe.min.js` accanto a sé:

```bash
curl -o axe.min.js https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js
```

- `audit_peso2.py` — peso della home per proprietario (tema / foto admin / app /
  Shopify / terze parti). Legge `home.html`, che va scaricato prima con curl.
- `audit_pallini.py` — replica la logica di `color-swatches.liquid` e dice quali
  pallini colore cadrebbero nel grigio di fallback. La lista prodotti è inline:
  va rigenerata da GraphQL se il catalogo cambia.

## Due avvertenze che costano tempo

**Quasi tutto quello che leggi in console è rumore dell'ambiente, non del sito.**
Lo scudo di Brave produce `ERR_BLOCKED_BY_CLIENT` e la rete di questa macchina
produce `ERR_CONNECTION_REFUSED` su `monorail-edge.shopifysvc.com`,
`otlp-http-production.shopifysvc.com` e `static-tracking.klaviyo.com`. Da lì
nascono a cascata decine di `TypeError: Failed to fetch` dentro `cdn/wpm/*.js` e
`portable-wallets.js` di Shopify. **Filtra per host prima di concludere
qualsiasi cosa.** Il 28 luglio, dei 17 errori della prima lettura, 16 erano
rumore e uno era vero (un 404).

**Le violazioni di contrasto possono venire da un popup.** Sempre il 28 luglio,
axe bocciava le etichette «Menu» e «IT» dell'header a 3,63:1. Non era un
problema di colori del tema (nero su crema fa ~18:1) ma il velo scuro
`rgba(20,20,20,0.6)` di un popup Klaviyo che si apre sopra la pagina. Prima di
toccare un colore, guarda cosa c'è **sotto** il testo con
`document.elementsFromPoint()` e fatti uno screenshot con `Page.captureScreenshot`.

**`pkill -f "<pattern>"` uccide la shell che lo lancia** se il pattern compare
nella sua riga di comando. `chiudi_brave.sh` chiude per PID con `pgrep -x` per
questo motivo.
