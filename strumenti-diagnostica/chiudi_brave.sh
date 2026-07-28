#!/usr/bin/env bash
# chiusura per PID: nessun pattern che possa matchare la shell chiamante
pids=$(pgrep -x brave 2>/dev/null; pgrep -x brave-browser 2>/dev/null)
if [ -z "$pids" ]; then echo "nessun processo trovato"; else
  echo "chiudo: $(echo $pids | tr '\n' ' ')"
  kill $pids 2>/dev/null
  sleep 2
  rimasti=$(pgrep -x brave 2>/dev/null | wc -l)
  [ "$rimasti" -gt 0 ] && kill -9 $(pgrep -x brave) 2>/dev/null
fi
sleep 1
if curl -s -m 3 http://127.0.0.1:9222/json/version >/dev/null 2>&1; then echo "ATTENZIONE: ancora in ascolto"; else echo "porta 9222 libera"; fi
echo "processi brave residui: $(pgrep -c -x brave 2>/dev/null || echo 0)"
