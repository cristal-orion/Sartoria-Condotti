#!/usr/bin/env python3
"""Peso reale della home, corretto.

Errori della prima versione, evitati qui:
  - le URL dell'HTML contengono &amp;: senza unescape il parametro width viene
    ignorato e Shopify serve l'originale a piena risoluzione (ogni foto 3,5 MB)
  - sommare tutte le varianti del srcset gonfia il totale: il browser ne scarica
    UNA per immagine, quindi misuriamo una variante realistica per file
"""
import collections
import html
import re
import subprocess

SP = "/tmp/claude-1000/-home-michele-Desktop-Progetti-Sartoria-Condotti/74a9a13a-f825-42f3-ad25-f52859b2d58c/scratchpad/"
h = open(SP + "home.html", encoding="utf-8", errors="replace").read()


def absolutize(u):
    u = html.unescape(u.strip())
    if u.startswith("//"):
        return "https:" + u
    if u.startswith("/"):
        return "https://www.sartoriacondotti.it" + u
    return u


scripts, styles, imgs = set(), set(), {}

for m in re.findall(r'<script[^>]+src="([^"]+)"', h):
    scripts.add(absolutize(m))
for m in re.findall(r'<link[^>]+href="([^"]+\.css[^"]*)"', h):
    styles.add(absolutize(m))

# immagini: una sola variante per file, la più grande sotto i 1920px
for pat in (r'<img[^>]+src="([^"]+)"', r'srcset="([^"]+)"'):
    for raw in re.findall(pat, h):
        for piece in raw.split(","):
            u = absolutize(piece.strip().split(" ")[0])
            if not u.startswith("http") or "cdn/shop" not in u:
                continue
            base = u.split("?")[0]
            w = re.search(r"[?&]width=(\d+)", u)
            w = int(w.group(1)) if w else 0
            if w > 1920:
                continue
            prev = imgs.get(base)
            if prev is None or w > prev[0]:
                imgs[base] = (w, u)

print(f"HTML home: {len(h)/1024:.0f} KiB")
print(f"script: {len(scripts)} · CSS: {len(styles)} · immagini distinte: {len(imgs)}")


def peso(u):
    out = subprocess.run(
        ["curl", "-s", "-o", "/dev/null", "-A", "Mozilla/5.0", "-L", "--max-time", "25",
         "-w", "%{size_download}"], capture_output=True, text=True, input=None,
        check=False) if False else subprocess.run(
        ["curl", "-s", "-o", "/dev/null", "-A", "Mozilla/5.0", "-L", "--max-time", "25",
         "-w", "%{size_download}", u], capture_output=True, text=True)
    try:
        return int(out.stdout.strip() or 0)
    except ValueError:
        return 0


def proprietario(u):
    host = re.sub(r"^https?://", "", u).split("/")[0]
    if ("/cdn/shop/t/" in u and "/assets/" in u) or "compiled_assets" in u:
        return "TEMA (nostro codice)"
    if "/extensions/" in u:
        return f"APP ({host})"
    if "cdn/shop/files" in u or "cdn/shop/products" in u:
        return "FOTO caricate in admin"
    if "shopifycloud" in u or host.endswith("shopify.com") or host == "shop.app":
        return "SHOPIFY (piattaforma)"
    return f"TERZE PARTI ({host})"


tot, conta, righe = collections.Counter(), collections.Counter(), []
for u in list(scripts) + list(styles) + [v[1] for v in imgs.values()]:
    n = peso(u)
    g = proprietario(u)
    tot[g] += n
    conta[g] += 1
    righe.append((n, g, u))

somma = sum(tot.values()) + len(h)
tot["HTML della pagina"] += len(h)
conta["HTML della pagina"] += 1

print(f"\nPeso di una visita alla home (una variante per immagine): {somma/1024:.0f} KiB\n")
print(f"{'proprietario':32s} {'peso':>9s} {'quota':>7s}  n")
for g, n in tot.most_common():
    print(f"{g:32s} {n/1024:8.0f}K {100*n/somma:6.1f}%  {conta[g]}")

print("\nLe 10 risorse più pesanti:")
for n, g, u in sorted(righe, reverse=True)[:10]:
    corta = u if len(u) < 88 else u[:52] + "…" + u[-31:]
    print(f"  {n/1024:7.0f}K  [{g.split(' ')[0]:9s}] {corta}")

print("\nFoto: quanto pesa l'originale caricato in admin (le 6 più grosse)")
originali = sorted({b for b in imgs})
pesi = [(peso(b), b) for b in originali]
for n, b in sorted(pesi, reverse=True)[:6]:
    print(f"  {n/1024:7.0f}K  {b.split('/')[-1]}")
grandi = [n for n, _ in pesi if n > 1_500_000]
print(f"  originali sopra 1,5 MB: {len(grandi)} su {len(pesi)}")
