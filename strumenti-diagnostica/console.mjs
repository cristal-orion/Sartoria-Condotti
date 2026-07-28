/**
 * Legge gli errori in console di una pagina, pilotando Brave (Chromium) via
 * DevTools Protocol. È lo stesso dato del controllo Lighthouse "Gli errori del
 * browser sono stati registrati nella console".
 *
 * Uso: node console.mjs <url> [secondi]
 */
const URL_TARGET = process.argv[2] || 'https://www.sartoriacondotti.it/';
const ATTESA = Number(process.argv[3] || 12) * 1000;
const PORT = 9222;

const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
const { webSocketDebuggerUrl } = await res.json();

const ws = new WebSocket(webSocketDebuggerUrl);
await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });

let id = 0;
const attesi = new Map();
const eventi = [];

ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && attesi.has(msg.id)) {
    attesi.get(msg.id)(msg.result ?? msg.error);
    attesi.delete(msg.id);
    return;
  }
  if (msg.method) eventi.push(msg);
};

const send = (method, params = {}, sessionId) =>
  new Promise((ok) => {
    const n = ++id;
    attesi.set(n, ok);
    ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

await send('Runtime.enable', {}, sessionId);
await send('Log.enable', {}, sessionId);
await send('Network.enable', {}, sessionId);
await send('Page.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride',
  { width: 1350, height: 940, deviceScaleFactor: 1, mobile: false }, sessionId);

await send('Page.navigate', { url: URL_TARGET }, sessionId);
await new Promise((r) => setTimeout(r, ATTESA));

// scorri la pagina: le immagini lazy e gli script che partono allo scroll
// non si vedono se si sta fermi in cima (è il limite di Lighthouse)
await send('Runtime.evaluate',
  { expression: 'window.scrollTo(0, document.body.scrollHeight)' }, sessionId);
await new Promise((r) => setTimeout(r, 4000));

const testo = (a) => (a ?? []).map((x) => x.value ?? x.description ?? x.unserializableValue ?? JSON.stringify(x.preview?.properties ?? x.className ?? '')).join(' ');

const console_err = [];
const eccezioni = [];
const log_browser = [];
const rete_ko = [];

for (const e of eventi) {
  if (e.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(e.params.type)) {
    console_err.push({ tipo: e.params.type, testo: testo(e.params.args), url: e.params.stackTrace?.callFrames?.[0]?.url });
  }
  if (e.method === 'Runtime.exceptionThrown') {
    const d = e.params.exceptionDetails;
    eccezioni.push({ testo: d.exception?.description || d.text, url: d.url || d.stackTrace?.callFrames?.[0]?.url, riga: d.lineNumber });
  }
  if (e.method === 'Log.entryAdded' && ['error', 'warning'].includes(e.params.entry.level)) {
    log_browser.push({ livello: e.params.entry.level, fonte: e.params.entry.source, testo: e.params.entry.text, url: e.params.entry.url });
  }
  if (e.method === 'Network.loadingFailed' && !e.params.canceled) {
    rete_ko.push({ errore: e.params.errorText, tipo: e.params.type });
  }
  if (e.method === 'Network.responseReceived' && e.params.response.status >= 400) {
    rete_ko.push({ errore: `HTTP ${e.params.response.status}`, url: e.params.response.url });
  }
}

const corto = (s, n = 200) => (s || '').replace(/\s+/g, ' ').slice(0, n);
const blocco = (titolo, arr, fmt) => {
  console.log(`\n${titolo}: ${arr.length}`);
  arr.slice(0, 12).forEach((x) => console.log('   ' + fmt(x)));
  if (arr.length > 12) console.log(`   … e altri ${arr.length - 12}`);
};

console.log(`pagina: ${URL_TARGET}`);
console.log(`eventi CDP raccolti: ${eventi.length}`);
blocco('ECCEZIONI JavaScript non catturate', eccezioni, (x) => `${corto(x.testo)}  [${corto(x.url, 90)}:${x.riga}]`);
blocco('console.error / console.warn', console_err, (x) => `${x.tipo}: ${corto(x.testo)}  [${corto(x.url, 90)}]`);
blocco('errori registrati dal browser (Log)', log_browser, (x) => `${x.livello}/${x.fonte}: ${corto(x.testo)}  [${corto(x.url, 90)}]`);
blocco('richieste di rete fallite', rete_ko, (x) => `${x.errore} ${corto(x.url || x.tipo, 110)}`);

ws.close();
process.exit(0);
