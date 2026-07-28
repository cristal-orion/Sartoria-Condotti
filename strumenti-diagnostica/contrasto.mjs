/**
 * Esegue axe-core (lo stesso motore di Lighthouse) sulla pagina e riporta le
 * violazioni di contrasto, con selettore, colori e rapporto misurato.
 *
 * Uso: node contrasto.mjs <url> [attesa_ms] [viewport: desktop|mobile]
 */
import { readFileSync } from 'node:fs';

const URL_TARGET = process.argv[2] || 'https://www.sartoriacondotti.it/';
const ATTESA = Number(process.argv[3] || 9000);
const VIEW = (process.argv[4] || 'desktop') === 'mobile'
  ? { width: 412, height: 823, deviceScaleFactor: 1.75, mobile: true }
  : { width: 1350, height: 940, deviceScaleFactor: 1, mobile: false };

const AXE = readFileSync(new URL('./axe.min.js', import.meta.url), 'utf8');

const { webSocketDebuggerUrl } = await (await fetch('http://127.0.0.1:9222/json/version')).json();
const ws = new WebSocket(webSocketDebuggerUrl);
await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = ko; });

let id = 0;
const attesi = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && attesi.has(msg.id)) { attesi.get(msg.id)(msg.result ?? msg.error); attesi.delete(msg.id); }
};
const send = (method, params = {}, sessionId) => new Promise((ok) => {
  const n = ++id; attesi.set(n, ok);
  ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', VIEW, sessionId);
await send('Page.navigate', { url: URL_TARGET }, sessionId);
await new Promise((r) => setTimeout(r, ATTESA));

const ev = async (expression, awaitPromise = false) => {
  const r = await send('Runtime.evaluate',
    { expression, awaitPromise, returnByValue: true, allowUnsafeEvalBlockedByCSP: true }, sessionId);
  if (r?.exceptionDetails) return { errore: r.exceptionDetails.text || r.exceptionDetails.exception?.description };
  return r?.result?.value;
};

await ev(AXE);
const presente = await ev('typeof axe');
if (presente !== 'function' && presente !== 'object') {
  console.log('axe non iniettato (CSP?):', presente);
  process.exit(1);
}

const out = await ev(`axe.run(document, {runOnly:['color-contrast'], resultTypes:['violations']})
  .then(r => JSON.stringify(r.violations.map(v => ({
    id: v.id, impatto: v.impact, quanti: v.nodes.length,
    nodi: v.nodes.slice(0,15).map(n => ({
      selettore: n.target.join(' '),
      messaggio: n.any?.[0]?.message || '',
      dati: n.any?.[0]?.data || null,
      html: (n.html||'').slice(0,150)
    }))
  }))))`, true);

if (out?.errore) { console.log('errore axe:', out.errore); process.exit(1); }
const viol = JSON.parse(out || '[]');
console.log(`pagina: ${URL_TARGET}   viewport: ${VIEW.mobile ? 'mobile' : 'desktop'} ${VIEW.width}x${VIEW.height}`);
if (!viol.length) { console.log('nessuna violazione di contrasto'); ws.close(); process.exit(0); }
for (const v of viol) {
  console.log(`\n${v.id} (impatto ${v.impatto}) — ${v.quanti} elementi`);
  for (const n of v.nodi) {
    const d = n.dati || {};
    console.log(`   ${n.selettore}`);
    console.log(`      rapporto ${d.contrastRatio ?? '?'} (richiesto ${d.expectedContrastRatio ?? '?'})  testo ${d.fgColor ?? '?'} su ${d.bgColor ?? '?'}  font ${d.fontSize ?? '?'} ${d.fontWeight ?? ''}`);
    console.log(`      ${n.html.replace(/\s+/g, ' ')}`);
  }
}
ws.close();
process.exit(0);
