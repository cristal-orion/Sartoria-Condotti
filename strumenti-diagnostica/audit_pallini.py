#!/usr/bin/env python3
# Replica la logica di snippets/color-swatches.liquid + color-hex.liquid
# per stabilire quali pallini escono grigi (#C9C9C9, il fallback).
import re, sys, collections

HEX_SRC = "/home/michele/Desktop/Progetti/Sartoria Condotti/snippets/color-hex.liquid"

# --- mappa colori letta direttamente dallo snippet, non riscritta a mano ---
src = open(HEX_SRC, encoding="utf-8").read()
COLOR_MAP = dict(re.findall(r"when '([^']+)'\s*\n\s*assign swatch_color = '(#[0-9A-Fa-f]{6})'", src))
FALLBACK = re.search(r"else\s*\n\s*assign swatch_color = '(#[0-9A-Fa-f]{6})'", src).group(1)


def derive_color(title):
    """Identica a color-swatches.liquid: parola centrale fra prima e ultima."""
    words = title.split(" ")
    if len(words) <= 2:
        return title.lower().strip()
    color_words = words[1:1 + (len(words) - 2)]          # slice: 1, color_len
    if color_words and color_words[0] in ("monopetto", "doppiopetto"):
        color_words = color_words[1:]                     # slice: 1, 99
    return " ".join(color_words).lower().strip()


# titolo, stato, gruppo_modello (None = nessun gruppo => nessun pallino)
P = [
 ("Abito doppiopetto blu navy Philip","ACTIVE",None),
 ("Abito doppiopetto blu notte Napoli","ACTIVE",None),
 ("Abito doppiopetto blu Sorrento","ACTIVE","sc-abito-sorrento"),
 ("Abito doppiopetto blu Sorrento","ACTIVE","sc-abito-sorrento"),
 ("Abito doppiopetto grigio Sorrento","ACTIVE","sc-abito-sorrento"),
 ("Abito doppiopetto moro Gess","ACTIVE","cc-abito-gess"),
 ("Abito doppiopetto moro Sorrento","ACTIVE","sc-abito-sorrento"),
 ("Abito doppiopetto nero Gess","ACTIVE","cc-abito-gess"),
 ("Abito doppiopetto tabacco Gess","ACTIVE","cc-abito-gess"),
 ("Abito doppiopetto verde Sorrento","ACTIVE","sc-abito-sorrento"),
 ("Abito monopetto azzurro Napoli","ACTIVE","sc-abito-napoli"),
 ("Abito monopetto beige Amir","ACTIVE","cc-abito-amir"),
 ("Abito monopetto beige Hope","ACTIVE","cc-abito-hope"),
 ("Abito monopetto beige Napoli","ACTIVE","sc-abito-napoli"),
 ("Abito monopetto beige Shedir","ACTIVE","sc-abito-shedir"),
 ("Abito monopetto blu Amalfi","ACTIVE",None),
 ("Abito monopetto blu Fleg","ACTIVE",None),
 ("Abito monopetto blu scuro Amir","ACTIVE","cc-abito-amir"),
 ("Abito monopetto bordeaux Shedir","ACTIVE","sc-abito-shedir"),
 ("Abito monopetto denim Hope","ACTIVE","cc-abito-hope"),
 ("Abito monopetto fango Napoli","ACTIVE","sc-abito-napoli"),
 ("Abito monopetto grigio antracite Amir","ACTIVE","cc-abito-amir"),
 ("Abito monopetto grigio chiaro Businessman","ACTIVE",None),
 ("Abito monopetto moro Nisida","ACTIVE",None),
 ("Abito monopetto nero Amir","ACTIVE","cc-abito-amir"),
 ("ART 110L","DRAFT",None),
 ("ART 91L","DRAFT",None),
 ("Camica nera Nadir","ACTIVE",None),
 ("Camicia arancio Opale","ACTIVE","cc-camicia-opale"),
 ("Camicia avion Gary","ACTIVE","sc-camicia-gary"),
 ("Camicia avion Rig","ACTIVE","cc-camicia-rig"),
 ("Camicia avion Rubino","ACTIVE",None),
 ("Camicia azzurra Essence","ACTIVE",None),
 ("Camicia azzurra Horizon","ACTIVE","sc-camicia-horizon"),
 ("Camicia azzurra Icon","ACTIVE",None),
 ("Camicia azzurra tir","ACTIVE","cc-camicia-tir"),
 ("Camicia azzurra Velas","ACTIVE","sc-camicia-velas"),
 ("Camicia azzurro chiaro Velas","ACTIVE","sc-camicia-velas"),
 ("Camicia azzurro Gary","ACTIVE","sc-camicia-gary"),
 ("Camicia azzurro Oxford","ACTIVE","cc-camicia-oxford"),
 ("Camicia beige Lin","ACTIVE","sc-camicia-lin"),
 ("Camicia bianca Ares","ACTIVE",None),
 ("Camicia bianca azzurra Rexo","ACTIVE","sc-camicia-rexo"),
 ("Camicia bianca azzurra Zion","ACTIVE",None),
 ("Camicia bianca Bassotto","ACTIVE",None),
 ("Camicia Bianca Blu Gate","ACTIVE",None),
 ("Camicia bianca blu Rexo","ACTIVE","sc-camicia-rexo"),
 ("Camicia bianca Horizon","ACTIVE","sc-camicia-horizon"),
 ("Camicia bianca Horizon","ACTIVE","sc-camicia-horizon"),
 ("Camicia bianca Illumi","DRAFT",None),
 ("Camicia bianco azzurro Loire","ACTIVE",None),
 ("Camicia bianco blu Quad","ACTIVE",None),
 ("Camicia bianco blu Save","ACTIVE","sc-camicia-save"),
 ("Camicia bianco Glow","ACTIVE","sc-camicia-glow"),
 ("Camicia bianco Lin","ACTIVE","sc-camicia-lin"),
 ("Camicia bianco Oxford","ACTIVE","cc-camicia-oxford"),
 ("Camicia bianco Rialto","ACTIVE","sc-camicia-rialto"),
 ("Camicia bianco United","ACTIVE","cc-camicia-united"),
 ("Camicia blu Cult","ACTIVE",None),
 ("Camicia blu fango Diamanti","ACTIVE",None),
 ("Camicia blu Gary","ACTIVE","sc-camicia-gary"),
 ("Camicia blu Lin","ACTIVE","sc-camicia-lin"),
 ("Camicia blu Rialto","ACTIVE","sc-camicia-rialto"),
 ("Camicia blu Rig","ACTIVE","cc-camicia-rig"),
 ("Camicia blu Save","ACTIVE","sc-camicia-save"),
 ("Camicia bluette Rig","ACTIVE","cc-camicia-rig"),
 ("Camicia celeste Rialto","ACTIVE","sc-camicia-rialto"),
 ("Camicia celeste United","ACTIVE","cc-camicia-united"),
 ("Camicia denim Den","ACTIVE",None),
 ("Camicia fantasia coriandoli Glow","ACTIVE","sc-camicia-glow"),
 ("Camicia fantasia floreale Glow","ACTIVE","sc-camicia-glow"),
 ("Camicia fantasia geometrica Glow","ACTIVE","sc-camicia-glow"),
 ("Camicia grigio bordeaux Zircone","ACTIVE",None),
 ("Camicia rosa Rigas","ACTIVE",None),
 ("Camicia rosa Tir","ACTIVE","cc-camicia-tir"),
 ("Camicia rossa Sot","ACTIVE",None),
 ("Camicia verde Opale","ACTIVE","cc-camicia-opale"),
 ("Cintura bianco blu Braid","DRAFT",None),
 ("Giacca monopetto arancio Procy","ACTIVE","sc-giacca-procy"),
 ("Giacca monopetto avion blu Guernica","ACTIVE","sc-giacca-guernica"),
 ("Giacca monopetto avion Fama","ACTIVE","cc-giacca-fama"),
 ("Giacca monopetto avion Ocra","ACTIVE","cc-giacca-ocra"),
 ("Giacca monopetto avion Ocra","ACTIVE","cc-giacca-ocra"),
 ("Giacca monopetto azzurro Limuro","ACTIVE","sc-giacca-limuro"),
 ("Giacca monopetto beige Bey","ACTIVE",None),
 ("Giacca monopetto beige moro Guernica","ACTIVE","sc-giacca-guernica"),
 ("Giacca monopetto beige moro Rent","ACTIVE",None),
 ("Giacca monopetto beige Procida","ACTIVE","sc-giacca-procida"),
 ("Giacca monopetto beige scuro Fan","ACTIVE","sc-giacca-fan"),
 ("Giacca monopetto beige United","ACTIVE",None),
 ("Giacca monopetto blu amaranto Fan","ACTIVE","sc-giacca-fan"),
 ("Giacca monopetto blu chiaro Fleg","ACTIVE","sc-giacca-fleg"),
 ("Giacca monopetto blu Conte","ACTIVE","cc-giacca-conte"),
 ("Giacca monopetto blu Fama","ACTIVE","cc-giacca-fama"),
 ("Giacca monopetto blu medio Fleg","ACTIVE","sc-giacca-fleg"),
 ("Giacca monopetto blu Primavera","ACTIVE",None),
 ("Giacca monopetto blu scuro Fleg","ACTIVE","sc-giacca-fleg"),
 ("Giacca monopetto bordeaux blu Guernica","ACTIVE","sc-giacca-guernica"),
 ("Giacca monopetto bordeaux Procida","ACTIVE","sc-giacca-procida"),
 ("Giacca monopetto moro avion Glef","ACTIVE",None),
 ("Giacca monopetto rosa Limuro","ACTIVE","sc-giacca-limuro"),
 ("Giacca monopetto sabbia Caos","ACTIVE","cc-giacca-caos"),
 ("Giacca monopetto turchese Caos","ACTIVE","cc-giacca-caos"),
 ("Giacca monopetto turchese Capri","ACTIVE",None),
 ("Giacca monopetto verde Conte","ACTIVE","cc-giacca-conte"),
 ("Giacca monopetto verde David","ACTIVE",None),
 ("Giacca monopetto verde Procida","ACTIVE","sc-giacca-procida"),
 ("Giacca monopetto verde Procy","ACTIVE","sc-giacca-procy"),
 ("Giubbotto beige Ylon","DRAFT","cc-giubbotto-ylon"),
 ("Giubbotto blu Birmania","DRAFT","sc-giubbotto-birmania"),
 ("Giubbotto blu royal Camo","DRAFT",None),
 ("Giubbotto bordeaux Birmania","DRAFT","sc-giubbotto-birmania"),
 ("Giubbotto nero Ylon","DRAFT","cc-giubbotto-ylon"),
 ("Giubbotto verde militare Birmania","DRAFT","sc-giubbotto-birmania"),
 ("Mocassino blu Ben","ACTIVE","cc-mocassino-ben"),
 ("Mocassino blu Los","ACTIVE","cc-mocassino-los"),
 ("Mocassino blu Scia","ACTIVE","cc-mocassino-scia"),
 ("Mocassino blu Sin","ACTIVE","sc-mocassino-sin"),
 ("Mocassino blue Cri","ACTIVE","cc-mocassino-cri"),
 ("Mocassino bordeaux Bord","ACTIVE","sc-mocassino-bord"),
 ("Mocassino cobalto Los","ACTIVE","cc-mocassino-los"),
 ("Mocassino cuoio Mok","ACTIVE","cc-mocassino-mok"),
 ("Mocassino grigio Ben","ACTIVE","cc-mocassino-ben"),
 ("Mocassino grigio Los","ACTIVE","cc-mocassino-los"),
 ("Mocassino nero Bord","ACTIVE","sc-mocassino-bord"),
 ("Mocassino nero Los","ACTIVE","cc-mocassino-los"),
 ("Mocassino nero Luc","ACTIVE",None),
 ("Mocassino taupe Los","ACTIVE","cc-mocassino-los"),
 ("Mocassino taupe Sin","ACTIVE","sc-mocassino-sin"),
 ("Mocassino testa di moro Bord","ACTIVE","sc-mocassino-bord"),
 ("Mocassino testa di moro Cri","ACTIVE","cc-mocassino-cri"),
 ("Mocassino testa di moro Scia","ACTIVE","cc-mocassino-scia"),
 ("Mocassino testa di moro Scia","ACTIVE","cc-mocassino-scia"),
 ("Mocassino testa di moro Sin","ACTIVE","sc-mocassino-sin"),
 ("Mocassino testa di moro Ted","ACTIVE",None),
 ("Mocassino verde Mok","ACTIVE","cc-mocassino-mok"),
 ("OMAGGIO - Regalo Carrello (non vendibile)","UNLISTED",None),
 ("Pantalaccio beige Lacc","ACTIVE",None),
 ("Pantalone beige Fiby","ACTIVE",None),
 ("Pantalone beige Ginestra","ACTIVE","sc-pantalone-ginestra"),
 ("Pantalone blu Amer","DRAFT",None),
 ("Pantalone bordeaux Ginestra","ACTIVE","sc-pantalone-ginestra"),
 ("Pantalone nero Fiby","ACTIVE",None),
 ("Pantalone ocra Ginestra","ACTIVE","sc-pantalone-ginestra"),
 ("Pantalone polvere Nare","DRAFT",None),
 ("Pantalone verde Ginestra","ACTIVE","sc-pantalone-ginestra"),
 ("PED 06","DRAFT",None),
 ("Polacchina blu Pola","ACTIVE","sc-polacchina-pola"),
 ("Polacchina testa di moro Pola","ACTIVE","sc-polacchina-pola"),
 ("Polo avion Nil","ACTIVE","sc-polo-nil"),
 ("Polo avion Poul","ACTIVE","cc-polo-poul"),
 ("Polo avion Vicy","ACTIVE","cc-polo-vicy"),
 ("Polo beige Art","ACTIVE","sc-polo-art"),
 ("Polo beige Poul","ACTIVE","cc-polo-poul"),
 ("Polo bianco Poul","ACTIVE","cc-polo-poul"),
 ("Polo bianco Vicy","ACTIVE","cc-polo-vicy"),
 ("Polo bianco Wear","ACTIVE","sc-polo-wear"),
 ("Polo blu Poul","ACTIVE","cc-polo-poul"),
 ("Polo blu Vicy","ACTIVE","cc-polo-vicy"),
 ("Polo blu Wear","ACTIVE","sc-polo-wear"),
 ("Polo bluette Art","ACTIVE","sc-polo-art"),
 ("Polo grigia Nil","ACTIVE","sc-polo-nil"),
 ("Polo grigio Art","ACTIVE","sc-polo-art"),
 ("Polo grigio chiaro Art","ACTIVE","sc-polo-art"),
 ("Polo lilla Poul","ACTIVE","cc-polo-poul"),
 ("Polo rosa Poul","ACTIVE","cc-polo-poul"),
 ("Polo rosso Vicy","ACTIVE","cc-polo-vicy"),
 ("Polo turchese Art","ACTIVE","sc-polo-art"),
 ("Polo turchese Nil","ACTIVE","sc-polo-nil"),
 ("Polo turchese Poul","ACTIVE","cc-polo-poul"),
 ("Sarto a domicilio","UNLISTED",None),
 ("Scarpa bordeaux Scar","ACTIVE","cc-scarpa-scar"),
 ("Scarpa bordeaux Scar","ACTIVE","cc-scarpa-scar"),
 ("Scarpa cognac Crust","ACTIVE",None),
 ("Scarpa crust legno Cru","ACTIVE","sc-scarpa-cru"),
 ("Scarpa cuoio Cru","ACTIVE","sc-scarpa-cru"),
 ("Scarpa nero Cru","ACTIVE","sc-scarpa-cru"),
 ("Scarpa nero Ner","ACTIVE",None),
 ("Scarpa nero Scar","ACTIVE","cc-scarpa-scar"),
 ("Scarpa nero Scar","ACTIVE","cc-scarpa-scar"),
 ("Scarpa testa di moro Cru","ACTIVE","sc-scarpa-cru"),
 ("Smoking blu Oper","ACTIVE",None),
 ("Smoking blu Smok","ACTIVE","cc-smoking-smok"),
 ("Smoking doppiopetto nero Romelu","ACTIVE",None),
 ("Smoking monopetto blu notte Billy","ACTIVE","cc-smoking-billy"),
 ("Smoking monopetto bluette Billy","ACTIVE","cc-smoking-billy"),
 ("Smoking monopetto nero Smok","ACTIVE","cc-smoking-smok"),
 ("Smoking monopetto panna Mar","ACTIVE",None),
 ("T-shirt beige Fill","ACTIVE","sc-t-shirt-fill"),
 ("T-shirt bianca Fill","ACTIVE","sc-t-shirt-fill"),
 ("T-shirt blu Fill","ACTIVE","sc-t-shirt-fill"),
 ("T-shirt sabbia Fill","ACTIVE","sc-t-shirt-fill"),
 ("T-shirt testa di moro Fill","ACTIVE","sc-t-shirt-fill"),
 ("T-shirt verde Fill","ACTIVE","sc-t-shirt-fill"),
 ("Trench beige Trey","ACTIVE","sc-trench-trey"),
 ("Trench blu Trey","ACTIVE","sc-trench-trey"),
 ("Trench bordeaux Trey","DRAFT","sc-trench-trey"),
 ("Trench verde militare Trey","DRAFT","sc-trench-trey"),
]

print(f"Prodotti analizzati: {len(P)}   |   voci in color-hex.liquid: {len(COLOR_MAP)}   |   fallback: {FALLBACK}\n")

con_pallini = [p for p in P if p[2]]
senza = [p for p in P if not p[2]]

print(f"Con gruppo colore (mostrano pallini): {len(con_pallini)}")
print(f"Senza gruppo colore (nessun pallino): {len(senza)}\n")

print("=" * 72)
print("1) PALLINI GRIGI — colore non presente in color-hex.liquid")
print("=" * 72)
grigi = [(t, s, g, derive_color(t)) for t, s, g in con_pallini if derive_color(t) not in COLOR_MAP]
if not grigi:
    print("  nessuno: tutti i colori dei prodotti raggruppati sono mappati.")
for t, s, g, c in grigi:
    print(f"  {t!r} [{s}] gruppo={g} -> colore dedotto {c!r}")

print()
print("=" * 72)
print("2) COLORI DOPPI NELLO STESSO GRUPPO — due pallini identici")
print("=" * 72)
gruppi = collections.defaultdict(list)
for t, s, g in con_pallini:
    gruppi[g].append((derive_color(t), t, s))
trovati = False
for g, items in sorted(gruppi.items()):
    cnt = collections.Counter(c for c, _, _ in items)
    dupi = {c for c, n in cnt.items() if n > 1}
    if dupi:
        trovati = True
        print(f"  {g}:")
        for c in sorted(dupi):
            for cc, t, s in items:
                if cc == c:
                    print(f"      {c!r}  <-  {t!r} [{s}]")
if not trovati:
    print("  nessuno.")

print()
print("=" * 72)
print("3) VOCI DELLA MAPPA MAI USATE (manutenzione)")
print("=" * 72)
usati = {derive_color(t) for t, _, g in con_pallini}
inutili = sorted(set(COLOR_MAP) - usati)
print(f"  {len(inutili)} su {len(COLOR_MAP)}: {', '.join(inutili)}")

print()
print("=" * 72)
print("4) PRODOTTI ATTIVI SENZA GRUPPO COLORE (nessun pallino in griglia)")
print("=" * 72)
attivi_senza = [(t, s) for t, s, g in senza if s == "ACTIVE"]
print(f"  {len(attivi_senza)} prodotti attivi:")
for t, s in attivi_senza:
    c = derive_color(t)
    flag = "" if c in COLOR_MAP else "   <-- colore FUORI mappa"
    print(f"      {t}{flag}")
