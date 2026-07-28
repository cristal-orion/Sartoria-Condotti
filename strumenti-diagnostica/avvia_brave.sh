#!/usr/bin/env bash
# Avvia Brave headless con gli scudi disattivati, per leggere la console come la
# vedrebbe un Chrome vanilla. In uno script per non avere il pattern della porta
# nella riga di comando della shell (pkill -f lo matcherebbe e ucciderebbe la shell).
SP="$(cd "$(dirname "$0")" && pwd)"
DATA="$SP/bravedata3"
rm -rf "$DATA"; mkdir -p "$DATA"

pgrep -f "brave.*9222" >/dev/null && pkill -f "brave.*9222"
sleep 1

nohup brave-browser \
  --headless=new \
  --remote-debugging-port=9222 \
  --user-data-dir="$DATA" \
  --no-first-run --no-default-browser-check \
  --disable-gpu --no-sandbox --disable-dev-shm-usage \
  --disable-brave-extension \
  --disable-features=BraveAdblock,BraveShieldsAdblock,BraveRewards,BraveAdsService,BraveSync \
  about:blank > "$SP/brave3.log" 2>&1 &

for i in $(seq 1 20); do
  if curl -s -m 2 http://127.0.0.1:9222/json/version >/dev/null 2>&1; then
    curl -s http://127.0.0.1:9222/json/version | grep -o '"Browser": "[^"]*"'
    exit 0
  fi
  sleep 1
done
echo "non è partito"; tail -5 "$SP/brave3.log"; exit 1
