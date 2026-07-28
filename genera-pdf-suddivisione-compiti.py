#!/usr/bin/env python3
"""
Genera il PDF "Suddivisione compiti pagina prodotto" per Sartoria Condotti.

Revisione 2 (28 luglio 2026). Correzioni rispetto alla revisione 1:
  1. pag. 2 — il campo custom.varianti_colore NON è inutilizzato: il tema lo usa
     già nelle griglie (pallini colore cliccabili). Manca solo in scheda prodotto.
  2. «Navigazione colori» va precisato «in scheda prodotto», altrimenti sembra
     lavoro già fatto.
  3. G2 — la soglia 139 € è GIÀ pubblicata nella barra annunci del sito, quindi
     non è una conferma preventiva ma una verifica su un messaggio già online.
  4. Nuova attività G7 — titoli duplicati nei gruppi colore (5 gruppi mostrano
     due pallini dello stesso colore).

Uso:  python3 genera-pdf-suddivisione-compiti.py
"""

import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, KeepTogether, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
)

# ---------------------------------------------------------------- costanti ---

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                   "Sartoria Condotti - Suddivisione compiti pagina prodotto (rev. 2).pdf")

NOTO = "/usr/share/fonts/truetype/noto"
DEJAVU = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

PAGE_W, PAGE_H = A4
MARGIN = 50
CONTENT_W = PAGE_W - 2 * MARGIN

BAND_H = 34          # banda navy in testa a pag. 1
BAND_RULE = 3.4      # filetto oro sotto la banda

# palette campionata dalla revisione 1
NAVY = colors.HexColor("#1B2A4A")
INK = colors.HexColor("#1A1D2E")
CREAM = colors.HexColor("#F6F2EA")
GOLD = colors.HexColor("#A8834E")
RULE = colors.HexColor("#D9D3C7")
MUTED = colors.HexColor("#6B6B72")
BODY = colors.HexColor("#353847")
GREEN = colors.HexColor("#2E6B4F")
RED = colors.HexColor("#A03232")

DATA_DOC = "27 luglio 2026"
DATA_REV = "28 luglio 2026"

# ------------------------------------------------------------------- font ---

pdfmetrics.registerFont(TTFont("Sans", f"{NOTO}/NotoSans-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Sans-SB", f"{NOTO}/NotoSans-SemiBold.ttf"))
pdfmetrics.registerFont(TTFont("Sans-B", f"{NOTO}/NotoSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Sans-I", f"{NOTO}/NotoSans-Italic.ttf"))
pdfmetrics.registerFont(TTFont("Serif", f"{NOTO}/NotoSerif-Regular.ttf"))
pdfmetrics.registerFont(TTFont("Serif-B", f"{NOTO}/NotoSerif-Bold.ttf"))
pdfmetrics.registerFont(TTFont("Glyph", DEJAVU))
pdfmetrics.registerFontFamily("Sans", normal="Sans", bold="Sans-B", italic="Sans-I",
                              boldItalic="Sans-I")

# ------------------------------------------------------------------ stili ---

S = {
    "h1": ParagraphStyle("h1", fontName="Serif-B", fontSize=23, leading=27,
                         textColor=NAVY, spaceAfter=4),
    "sub": ParagraphStyle("sub", fontName="Sans", fontSize=11.5, leading=15,
                          textColor=MUTED, spaceAfter=0),
    "h2": ParagraphStyle("h2", fontName="Serif-B", fontSize=15.5, leading=19,
                         textColor=NAVY, spaceAfter=0),
    "h3": ParagraphStyle("h3", fontName="Sans-B", fontSize=9.4, leading=12,
                         textColor=NAVY, spaceBefore=7, spaceAfter=3.5),
    "body": ParagraphStyle("body", fontName="Sans", fontSize=9.5, leading=14,
                           textColor=BODY, alignment=TA_JUSTIFY, spaceAfter=7),
    "card": ParagraphStyle("card", fontName="Sans", fontSize=8.6, leading=12.1,
                           textColor=BODY, alignment=TA_JUSTIFY, spaceAfter=4.5),
    "bullet": ParagraphStyle("bullet", fontName="Sans", fontSize=8.6, leading=12.1,
                             textColor=BODY, leftIndent=12, firstLineIndent=-12,
                             spaceAfter=3),
    "note": ParagraphStyle("note", fontName="Sans", fontSize=8.4, leading=11.8,
                           textColor=BODY, alignment=TA_JUSTIFY),
    "cell": ParagraphStyle("cell", fontName="Sans", fontSize=8.4, leading=11.2,
                           textColor=BODY),
    "cellh": ParagraphStyle("cellh", fontName="Sans-B", fontSize=8.4, leading=11.2,
                            textColor=colors.white),
    "glyph": ParagraphStyle("glyph", fontName="Glyph", fontSize=8.8, leading=11.2,
                            textColor=BODY),
    "cardtitle": ParagraphStyle("cardtitle", fontName="Serif-B", fontSize=11.5,
                                leading=14, textColor=NAVY),
    "prio": ParagraphStyle("prio", fontName="Sans-B", fontSize=7.3, leading=10,
                           alignment=TA_RIGHT),
    "credit": ParagraphStyle("credit", fontName="Sans", fontSize=7.6, leading=11,
                             textColor=MUTED),
}


def hx(color):
    """#rrggbb per i tag <font color=...> dei Paragraph."""
    return "#" + color.hexval()[2:]


def bullets(items, style="bullet"):
    return [Paragraph(f"–&nbsp;&nbsp;{t}", S[style]) for t in items]


# ------------------------------------------------------------- flowable(s) ---

class Eyebrow(Flowable):
    """Occhiello oro, maiuscolo, lievemente spaziato (charSpace via canvas)."""

    def __init__(self, text, color=GOLD, size=7.5, space_after=3):
        super().__init__()
        self.text, self.color, self.size, self.sa = text.upper(), color, size, space_after

    def wrap(self, aw, ah):
        return CONTENT_W, self.size + self.sa

    def draw(self):
        # il charSpace è disponibile sul text object, non sul canvas
        t = self.canv.beginText(0, self.sa)
        t.setFont("Sans-SB", self.size)
        t.setFillColor(self.color)
        t.setCharSpace(1.15)
        t.textOut(self.text)
        self.canv.drawText(t)


class HRule(Flowable):
    def __init__(self, color=RULE, width=0.9, space_before=4, space_after=8):
        super().__init__()
        self.color, self.lw, self.sb, self.sa = color, width, space_before, space_after

    def wrap(self, aw, ah):
        return CONTENT_W, self.lw + self.sb + self.sa

    def draw(self):
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.lw)
        self.canv.line(0, self.sa, CONTENT_W, self.sa)


def section(eyebrow, title, gap_before=13):
    """Occhiello + titolo serif + filetto, tenuti insieme."""
    return KeepTogether([
        Spacer(1, gap_before),
        Eyebrow(eyebrow),
        Paragraph(title, S["h2"]),
        HRule(space_before=5, space_after=9),
    ])


def callout(parts, bg=CREAM, border=GOLD, style="note"):
    """Riquadro crema con bordo sinistro colorato."""
    inner = []
    for i, p in enumerate(parts):
        if i:
            inner.append(Spacer(1, 5))
        inner.append(Paragraph(p, S[style]))
    t = Table([[inner]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LINEBEFORE", (0, 0), (0, -1), 3, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def data_table(header, rows, widths, glyph_col=None, zebra=True, first_bold=False):
    """Tabella con testata INK e righe alternate crema."""
    data = [[Paragraph(h, S["cellh"]) for h in header]]
    for r in rows:
        line = []
        for i, cell in enumerate(r):
            if glyph_col is not None and i == glyph_col:
                txt, col = cell if isinstance(cell, tuple) else (cell, BODY)
                st = ParagraphStyle("g", parent=S["glyph"], textColor=col)
                line.append(Paragraph(txt, st))
            elif first_bold and i == 0:
                line.append(Paragraph(f"<b>{cell}</b>", S["cell"]))
            else:
                line.append(Paragraph(cell, S["cell"]) if isinstance(cell, str) else cell)
        data.append(line)

    t = Table(data, colWidths=widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, RULE),
    ]
    if zebra:
        for i in range(1, len(data)):
            if i % 2 == 1:
                style.append(("BACKGROUND", (0, i), (-1, i), CREAM))
    t.setStyle(TableStyle(style))
    return t


def card(code, title, prio, prio2, body, inner_width=None):
    """Scheda attività G-n con chip navy, titolo e etichetta priorità."""
    iw = inner_width or (CONTENT_W - 22)
    prio_color = RED if "ALTA" in prio else GOLD
    chip = Table([[Paragraph(f'<font color="#FFFFFF"><b>{code}</b></font>', S["cell"])]],
                 colWidths=[26], rowHeights=[15])
    chip.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), INK),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))

    label = f'<font color="{hx(prio_color)}">{prio}</font>'
    if prio2:
        label += f'<br/><font color="{hx(prio_color)}">{prio2}</font>'

    head = Table([[chip, Paragraph(title, S["cardtitle"]),
                   Paragraph(label, S["prio"])]],
                 colWidths=[34, iw - 34 - 120, 120])
    head.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))

    # splitInRow: la scheda può spezzarsi fra due pagine invece di lasciare
    # mezza pagina bianca quando non ci sta (con KeepTogether restavano buchi
    # da 230-260pt fra G1/G2 e fra G6/G7).
    box = Table([[[head] + body]], colWidths=[CONTENT_W], splitInRow=1)
    box.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.8, RULE),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return [box, Spacer(1, 8)]


def card_callout(parts, width):
    """Nota crema annidata dentro una scheda G-n."""
    inner = []
    for i, p in enumerate(parts):
        if i:
            inner.append(Spacer(1, 4))
        inner.append(Paragraph(p, S["note"]))
    t = Table([[inner]], colWidths=[width])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CREAM),
        ("LINEBEFORE", (0, 0), (0, -1), 2.5, GOLD),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


# ------------------------------------------------------------ impaginazione ---

def draw_first(canv, doc):
    canv.saveState()
    canv.setFillColor(NAVY)
    canv.rect(0, PAGE_H - BAND_H, PAGE_W, BAND_H, stroke=0, fill=1)
    canv.setFillColor(GOLD)
    canv.rect(0, PAGE_H - BAND_H - BAND_RULE, PAGE_W, BAND_RULE, stroke=0, fill=1)
    draw_footer(canv, doc)
    canv.restoreState()


def draw_rest(canv, doc):
    canv.saveState()
    canv.setFont("Sans", 7.6)
    canv.setFillColor(MUTED)
    canv.drawString(MARGIN, PAGE_H - 40,
                    "Sartoria Condotti · Ottimizzazione pagina prodotto")
    canv.setStrokeColor(RULE)
    canv.setLineWidth(0.9)
    canv.line(MARGIN, PAGE_H - 48, PAGE_W - MARGIN, PAGE_H - 48)
    draw_footer(canv, doc)
    canv.restoreState()


def draw_footer(canv, doc):
    y = 42
    canv.setStrokeColor(RULE)
    canv.setLineWidth(0.9)
    canv.line(MARGIN, y + 12, PAGE_W - MARGIN, y + 12)
    canv.setFont("Sans", 7.6)
    canv.setFillColor(MUTED)
    canv.drawString(MARGIN, y, f"{DATA_REV} · TwoBee · revisione 2")
    canv.drawRightString(PAGE_W - MARGIN, y, f"pag. {canv.getPageNumber()}")


def build(story):
    doc = BaseDocTemplate(
        OUT, pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=MARGIN, bottomMargin=64,
        title="Sartoria Condotti — Ottimizzazione pagina prodotto: suddivisione compiti",
        author="Michele Cristallo — TwoBee",
        subject="Piano di lavoro tema / admin Shopify — revisione 2",
    )
    first = Frame(MARGIN, 64, CONTENT_W, PAGE_H - 64 - (BAND_H + BAND_RULE + 26),
                  id="first", leftPadding=0, rightPadding=0,
                  topPadding=0, bottomPadding=0)
    rest = Frame(MARGIN, 64, CONTENT_W, PAGE_H - 64 - 62,
                 id="rest", leftPadding=0, rightPadding=0,
                 topPadding=0, bottomPadding=0)
    doc.addPageTemplates([
        PageTemplate(id="first", frames=[first], onPage=draw_first),
        PageTemplate(id="rest", frames=[rest], onPage=draw_rest),
    ])
    doc.build(story)


# ---------------------------------------------------------------- contenuto ---

CW = CONTENT_W - 22          # larghezza utile dentro una scheda G-n

story = []
A = story.append
AC = story.extend      # le schede G-n sono liste (box + spaziatura)

# --- testa -------------------------------------------------------------------
A(Eyebrow(f"Piano di lavoro · Luglio 2026 · revisione del {DATA_REV}"))
A(Spacer(1, 6))
A(Paragraph("Ottimizzazione della pagina prodotto", S["h1"]))
A(Paragraph("Suddivisione dei compiti fra tema e amministrazione Shopify", S["sub"]))
A(HRule(space_before=12, space_after=12))

A(Paragraph(
    "Abbiamo ricevuto il documento «Possibili modifiche per l'e-commerce di Sartoria "
    "Condotti»: un'analisi condotta da mobile su oltre 80 brand fra sartoria, "
    "abbigliamento e marketplace, che raccoglie 7 suggerimenti più un bonus, tutti "
    "concentrati sulla pagina prodotto.", S["body"]))
A(Paragraph(
    "Ho analizzato ogni punto e l'ho incrociato con lo stato reale del tema e dello "
    "store. Questo documento serve a dividere il lavoro: <b>cosa realizzo io lato "
    "tema</b> e <b>cosa serve invece da te, dall'amministrazione Shopify</b>, dove io "
    "non posso arrivare nemmeno via CLI.", S["body"]))
A(Spacer(1, 3))
A(callout([
    "<b>In sintesi:</b> dei 7 punti + bonus, <b>5 li copro interamente dal tema</b>. "
    "Apple Pay risulta <b>già attivo</b>. Restano <b>7 attività per te</b>, di cui 2 "
    "bloccanti (soglie di spedizione e misure dei capi) e 1 ad alto impatto (app "
    "recensioni).",
    f"<b>Cosa cambia in questa revisione.</b> Il sistema dei pallini colore in griglia "
    f"<b>esiste già ed è mio</b>: la revisione 1 lo dava per non fatto. Il lavoro che "
    f"resta è portarlo in scheda prodotto. In più la soglia di 139 € risulta già "
    f"pubblicata sul sito, e l'audit del {DATA_REV} ha fatto emergere una nuova "
    f"attività per te (G7).",
]))

# --- i sette suggerimenti ----------------------------------------------------
A(section("Punto di partenza", "I sette suggerimenti del documento"))
A(data_table(
    ["#", "Suggerimento", "Chi lo realizza", "Stato"],
    [
        ["1", "<b>Completa il look</b> — cross-sell in scheda prodotto con taglia e "
              "aggiunta rapida al carrello", "Tema + rifinitura admin", "Da fare"],
        ["2", "<b>Social proof</b> — riquadri di rassicurazione e recensioni con stelle",
         "Tema (riquadri)<br/>Admin (app recensioni)", "Da fare"],
        ["3", "<b>Aiuto taglia</b> — come veste il capo, misure reali, conversione "
              "IT/US/INT; Q&amp;A", "Tema (struttura)<br/>Cliente (misure)", "Da fare"],
        ["4", "<b>La parola «gratis»</b> — spedizione gratuita messa in evidenza",
         "Tema", "<b>Barra in alto già online</b>"],
        ["5", "<b>Lista dei desideri</b> — il cuore, come carrello abbandonato «leggero»",
         "Tema", "Da fare"],
        ["6", "<b>Più informazioni</b> — accordion e icone oltre alla descrizione base",
         "Tema", "Da fare"],
        ["7", "<b>Apple Pay</b> e PayPal come pagamento rapido", "Admin (sola verifica)",
         f'<font color="{hx(GREEN)}"><b>Apple Pay già attivo</b></font>'],
        ["+", "<b>Gift Card</b> (extra)", "Admin", "Da fare"],
    ],
    widths=[26, 232, 137, 100]))

# --- verifiche ---------------------------------------------------------------
A(section("Verifiche", "Cosa ho controllato sullo store"))
A(Paragraph(
    f"Prima di pianificare ho interrogato direttamente l'Admin API per non lavorare su "
    f"ipotesi. Questi sono i dati reali al {DATA_DOC}, con le righe sul sistema colori "
    f"aggiornate all'audit del {DATA_REV}.", S["body"]))
A(data_table(
    ["", "Elemento", "Risultato"],
    [
        [("✓", GREEN), "Apple Pay / Google Pay / Shop Pay",
         "Già attivi sui pagamenti, e il blocco di pagamento rapido è già presente "
         "nella scheda prodotto"],
        [("✓", GREEN), "Blocco stelle recensioni nel tema",
         "Già pronto: legge <b>reviews.rating</b>, si accende da solo appena arrivano "
         "i dati"],
        [("✗", RED), "App recensioni", "Nessuna installata — zero recensioni su 198 prodotti"],
        [("✗", RED), "Prodotti complementari", "Non configurati su nessun prodotto"],
        [("✗", RED), "Prodotto Gift Card", "Non esiste"],
        [("✗", RED), "Campo «Vestibilità»",
         "Esiste come campo Shopify ma è vuoto su tutti i prodotti"],
        [("✓", GREEN), "Dettagli modello", "Popolato correttamente (altezza, taglia indossata)"],
        [("✓", GREEN), "Campo «Varianti colore»",
         "<b>Correzione alla revisione 1:</b> è popolato in admin <b>e il tema lo usa "
         "già</b> — sono i pallini colore cliccabili sotto i titoli nelle griglie. "
         "Il tuo lavoro non è sprecato. Manca solo in scheda prodotto"],
        [("✓", GREEN), "Pallini colore, copertura",
         "149 prodotti su 198 hanno un gruppo colore; i 49 restanti sono monocolore, "
         "e per loro è giusto non mostrare pallini. <b>Zero colori fuori mappa:</b> "
         "nessun pallino grigio in giro"],
        [("▲", GOLD), "Titoli duplicati nei gruppi",
         "5 gruppi mostrano <b>due pallini dello stesso colore</b>, perché articoli "
         "diversi hanno titolo identico — nuova attività <b>G7</b>"],
        [("▲", GOLD), "Barra annunci in cima al sito",
         "Già online: «SPEDIZIONE GRATUITA DA 139 € · IN TUTTA ITALIA». La soglia è "
         "quindi <b>già pubblicata</b> — cambia il senso di <b>G2</b>"],
        [("▲", GOLD), "Soglie di spedizione",
         "Italia 5 € — <b>gratis oltre 139 €</b>; Europa 25 € — gratis oltre 249 €; "
         "USA e Arabia 30 € — gratis oltre 349 €. Ma il profilo «Abbigliamento», zona "
         "«Mondo», è 50 € fissi <b>senza soglia gratuita</b>"],
    ],
    widths=[22, 150, 323], glyph_col=0))
A(Spacer(1, 9))
A(callout([
    "<b>Nota su Apple Pay (punto 7).</b> Non serve fare nulla: risulta già abilitato "
    "insieme a Google Pay e Shop Pay, e il pulsante è già nella scheda prodotto. "
    "L'unica cosa da controllare è PayPal — vedi attività <b>G3</b>.",
], border=GREEN))

# --- lato tema ---------------------------------------------------------------
A(section("Lato tema", "Cosa realizzo io — non serve il tuo intervento"))
A(Paragraph(
    "Partiamo da un primo blocco di interventi che tocca solo il tema: nessuna app, "
    "nessun costo aggiuntivo, nessuna dipendenza esterna.", S["body"]))
A(Paragraph("Primo blocco — in lavorazione", S["h3"]))
for b in bullets([
    "<b>Riquadro di rassicurazione</b> sotto il pulsante di acquisto: spedizione "
    "gratuita, reso, pagamenti sicuri, confezione sartoriale napoletana <i>(punto 2a)</i>",
    "<b>Messaggio «spedizione gratuita»</b> in scheda prodotto, con l'indicazione di "
    "quanto manca alla soglia. La barra in cima al sito <b>c'è già</b> <i>(punto 4)</i>",
    "<b>Nuovi accordion:</b> Spedizioni e resi, Cura del capo, Serve aiuto <i>(punto 6)</i>",
    "<b>Lista dei desideri</b> con il cuore su scheda prodotto e griglie, più una pagina "
    "«I tuoi preferiti». Salvata nel browser: nessun login richiesto, nessuna app "
    "<i>(punto 5)</i>",
    "<b>Navigazione fra i colori in scheda prodotto.</b> In griglia i pallini ci sono "
    "già e funzionano; in scheda no, quindi chi entra sulla t-shirt blu non ha modo di "
    "passare alla verde. Riuso lo stesso campo che hai compilato in admin",
]):
    A(b)
A(Paragraph("Blocchi successivi", S["h3"]))
for b in bullets([
    "<b>Guida alle taglie</b> in finestra dedicata, con tabella misure per categoria e "
    "conversione IT / US / internazionale — <i>mi servono le misure, vedi</i> <b>G5</b>",
    "<b>Completa il look</b> con selettore taglia e aggiunta rapida al carrello, più i "
    "prodotti simili riorganizzati a schede — <i>vedi</i> <b>G6</b>",
    "<b>Stelle e recensioni</b> in scheda prodotto e nelle griglie — <i>si accendono da "
    "sole quando installi l'app, vedi</i> <b>G1</b>",
]):
    A(b)
A(Spacer(1, 8))
A(callout([
    "<b>Cosa non tocco.</b> Il carrello resta quello di UpCart, gestito dalla sua "
    "dashboard. Non intervengo sulle pagine dei quattro brand né sull'Atelier del "
    "Tessuto, appena pubblicati.",
]))

# --- lato admin --------------------------------------------------------------
A(section("Lato amministrazione", "Cosa serve da te, Gabriele"))
A(Paragraph(
    "Sette attività. Le prime due sbloccano lavoro che ho già in coda, quindi ti chiedo "
    "di partire da quelle. La settima (<b>G7</b>) è nuova: è emersa dall'audit del "
    f"{DATA_REV} e non era nella revisione 1.", S["body"]))
A(Spacer(1, 3))

# G1
AC(card("G1", "Installare un'app recensioni", "PRIORITÀ ALTA", "", [
    Paragraph("È il punto 2b del documento, ed è quello con l'impatto più alto sulla "
              "conversione. Oggi lo store non ha nessuna recensione.", S["card"]),
    Paragraph("Cosa fare", S["h3"]),
    *bullets([
        "Installare <b>Judge.me</b> dallo Shopify App Store, piano gratuito "
        "(l'alternativa è Loox, ma è a pagamento)",
        "Attivare le <b>email automatiche di richiesta recensione</b> dopo la consegna "
        "— suggerisco 21 giorni, il tempo di indossare il capo",
        "Se hai recensioni raccolte altrove (Google, Facebook, WhatsApp), importarle: "
        "si parte già con una base credibile",
    ]),
    Spacer(1, 6),
    card_callout([
        "<b>Non serve che inserisci widget nel tema.</b> Il blocco stelle è già pronto "
        "e si collega da solo. Se l'app propone di «aggiungere il widget al tema», "
        "lasciala pure fare per il riquadro recensioni a fondo pagina, ma le stelle "
        "sotto il titolo le gestisco io.",
    ], CW),
    Spacer(1, 6),
    Paragraph("<b>Tempi.</b> Meglio installare l'app e far partire le email adesso, e "
              "mostrare il riquadro recensioni fra tre o quattro settimane: un widget "
              "«0 recensioni» in bella vista fa più danno che bene.", S["card"]),
]))

# G2
AC(card("G2", "Allineare le soglie di spedizione", "PRIORITÀ ALTA", "BLOCCANTE", [
    Paragraph("Il punto 4 del documento chiede di mettere in evidenza la parola "
              "«gratis».", S["card"]),
    card_callout([
        "<b>Correzione alla revisione 1.</b> Lì scrivevo «prima di scriverlo sul sito "
        "devo essere certo che il messaggio sia vero». Non è più così: la barra in cima "
        "al sito <b>dice già</b> «SPEDIZIONE GRATUITA DA 139 € · IN TUTTA ITALIA», ed "
        "era già online prima di questo documento. Quindi non ti chiedo una conferma "
        "preventiva: <b>se 139 € non è il numero giusto, è sbagliato adesso, in "
        "pubblico.</b>",
    ], CW),
    Spacer(1, 8),
    Paragraph("La situazione attuale", S["h3"]),
    data_table(
        ["Profilo", "Zona", "Costo", "Soglia gratuita"],
        [
            ["Generale", "Italia", "5 €", "139 €"],
            ["Generale", "Europa", "25 €", "249 €"],
            ["Generale", "Nord America / Arabia", "30 €", "349 €"],
            ["Abbigliamento", "Italia", "5 €", "139 €"],
            ["Abbigliamento", "Mondo", "50 €",
             f'<font color="{hx(RED)}"><b>nessuna</b></font>'],
        ],
        widths=[110, 150, 80, 131]),
    Spacer(1, 8),
    Paragraph("Cosa mi serve", S["h3"]),
    *bullets([
        "<b>Confermarmi che 139 € è la soglia italiana corretta</b>, dato che è già "
        "pubblicata. Se è sbagliata la correggo subito",
        "Decidere se aggiungere anche a «Abbigliamento — Mondo» una soglia di gratuità, "
        "allineata alle altre",
    ]),
]))

# G3
AC(card("G3", "Verificare PayPal e i pulsanti rapidi", "PRIORITÀ MEDIA", "", [
    Paragraph("Punto 7. Apple Pay è già attivo, quindi resta solo una verifica veloce "
              "in <b>Impostazioni &gt; Pagamenti</b>.", S["card"]),
    *bullets([
        "Controllare che <b>PayPal Express Checkout</b> risulti attivo",
        "Controllare che i <b>pulsanti di pagamento dinamici</b> siano abilitati: sono "
        "quelli che fanno comparire Apple Pay su iPhone e Shop Pay altrove",
        "Se ci sono metodi attivi ma poco usati, dimmelo: le icone dei pagamenti in "
        "fondo alla scheda prodotto le pilotiamo da lì",
    ]),
]))

# G4
AC(card("G4", "Creare il prodotto Gift Card", "PRIORITÀ MEDIA", "", [
    Paragraph("È il bonus del documento. Il tema ha già la pagina e il modulo per il "
              "destinatario: manca solo il prodotto.", S["card"]),
    *bullets([
        "<b>Prodotti &gt; Gift card &gt; Aggiungi gift card</b>",
        "Tagli suggeriti: <b>100 · 250 · 500 · 1.000 €</b>",
        "Immagine dedicata, coerente con il resto del sito — se serve la preparo io",
        "Pubblicarla sul canale <b>Negozio online</b>",
    ]),
    Spacer(1, 4),
    Paragraph("Quando è pronta la collego io: voce di menu, link nel footer e una "
              "pagina dedicata.", S["card"]),
]))

# G5
AC(card("G5", "Raccogliere le misure reali dei capi", "PRIORITÀ ALTA", "BLOCCANTE", [
    Paragraph("Punto 3a, ed è il più citato nel documento. La domanda dell'utente è "
              "sempre la stessa: «una 42 di collo a che taglia corrisponde? come faccio "
              "a sapere qual è la mia?». La struttura la costruisco io, ma i numeri "
              "devono arrivare dal cliente o dal sarto.", S["card"]),
    Paragraph("Cosa chiedere, per categoria e per taglia, in centimetri", S["h3"]),
    data_table(
        ["Categoria", "Misure necessarie"],
        [
            ["Camicie", "Collo · Petto · Spalle · Lunghezza manica · Lunghezza capo"],
            ["Abiti e giacche", "Petto · Spalle · Vita · Lunghezza capo · Lunghezza manica"],
            ["Pantaloni", "Vita · Fianchi · Cavallo · Lunghezza gamba · Fondo"],
            ["Scarpe", "Corrispondenza numero italiano / UK / US"],
        ],
        widths=[110, 361], first_bold=True),
    Spacer(1, 8),
    Paragraph("Serve anche una cosa in più", S["h3"]),
    *bullets([
        "La <b>vestibilità di ogni linea</b>: slim, regular o comoda. Oggi il campo "
        "esiste in Shopify ma è vuoto su tutti i prodotti",
        "Se le linee sono poche e ricorrenti, basta l'elenco: i prodotti li compilo io "
        "in blocco",
    ]),
    Spacer(1, 3),
    Paragraph("<b>Formato:</b> va benissimo un semplice foglio Excel, una riga per "
              "taglia. Non serve altro.", S["card"]),
]))

# G6
AC(card("G6", "Rifinire gli abbinamenti «Completa il look»", "PRIORITÀ MEDIA",
       "DOPO DI ME", [
    Paragraph("Punto 1. Qui il grosso lo faccio io: creo il campo abbinamenti e lo "
              "compilo in blocco su tutti i prodotti seguendo delle regole — a un abito "
              "si abbinano camicia, cravatta e scarpe, a una camicia una cravatta e un "
              "pantalone, e così via.", S["card"]),
    Paragraph("A te resta la parte di gusto: rivedere gli abbinamenti sui prodotti più "
              "importanti e correggere quelli che non funzionano, direttamente dalla "
              "scheda prodotto. Ti mando io la lista quando è pronta.", S["card"]),
    Spacer(1, 4),
    card_callout([
        "<b>Perché non usiamo l'app Search &amp; Discovery.</b> Farebbe la stessa cosa, "
        "ma richiederebbe di abbinare <b>198 prodotti a mano</b> e ci legherebbe a "
        "un'app per la resa grafica. Con un campo nostro popolo tutto via API in una "
        "volta sola e controllo il layout.",
    ], CW),
]))

# G7 — nuova
AC(card("G7", "Distinguere i titoli duplicati nei gruppi colore", "PRIORITÀ MEDIA", "", [
    Paragraph(
        f"<b>Attività nuova, non era nella revisione 1.</b> È emersa dall'audit del "
        f"{DATA_REV} sui 198 prodotti. I pallini ricavano il nome del colore <b>dal "
        f"titolo del prodotto</b>. In cinque gruppi due articoli diversi hanno lo stesso "
        f"titolo: il risultato è che il cliente vede due pallini identici e non sa quale "
        f"scegliere. Nel gruppo scarpe Scar vede <b>quattro pallini ma solo due "
        f"colori</b>.", S["card"]),
    data_table(
        ["Gruppo", "Colore doppio", "I due prodotti"],
        [
            ["cc-scarpa-scar", "bordeaux <b>e</b> nero",
             "scar-181 / tag-2012 · tag-2020 / tag-2022"],
            ["cc-mocassino-scia", "testa di moro", "tag-2016 / tag-2031"],
            ["sc-abito-sorrento", "blu", "nome-prezzo-rivestimento / tag-1007"],
            ["sc-camicia-horizon", "bianca", "camicia-bianca-horizon / tag-1122"],
            ["cc-giacca-ocra", "avion", "ocra-189 / 189"],
        ],
        widths=[120, 110, 241], first_bold=True),
    Spacer(1, 8),
    Paragraph("Cosa fare", S["h3"]),
    *bullets([
        "Nei primi quattro casi gli articoli sono <b>davvero diversi</b> — codici TAG, "
        "foto e giacenze diverse: basta aggiungere al titolo il dettaglio che li "
        "distingue (pelle, suola, modello)",
        "L'ultimo caso è diverso: «Giacca monopetto avion Ocra» esiste due volte sullo "
        "stesso articolo 189, stesso prezzo, con foto e giacenze diverse. Lì va deciso "
        "se <b>unirli</b>",
    ]),
    Spacer(1, 5),
    card_callout([
        "<b>Un'altra cosa piccola, mentre ci sei.</b> «Abito doppiopetto blu Sorrento» "
        "sta all'indirizzo <b>/products/nome-prezzo-rivestimento</b>: un handle "
        "segnaposto rimasto in produzione, pubblico e indicizzabile. Se lo cambi "
        "dimmelo, perché serve un redirect: altrimenti il vecchio link muore.",
        "<b>Nota:</b> i 49 prodotti senza pallini sono monocolore. Confermato, nessun "
        "intervento — è giusto che non mostrino nulla.",
    ], CW),
]))

# --- due punti aperti --------------------------------------------------------
A(section("Da decidere insieme", "Due punti aperti"))
A(Paragraph("Le domande e risposte in scheda prodotto (punto 3b)", S["h3"]))
A(Paragraph(
    "Il documento mostra il sistema di Amazon, dove sono gli utenti a fare le domande. "
    "Replicarlo richiede un'app dedicata. La mia proposta è più semplice: una sezione "
    "<b>domande frequenti per categoria</b>, scritta da noi e curata nei contenuti, che "
    "risponde alle stesse obiezioni — come lavarlo, quanto dura la spedizione, si può "
    "modificare in sartoria, come funziona il reso. Zero costi ricorrenti e controllo "
    "totale sul tono. Se poi le domande via WhatsApp diventassero tante, valutiamo "
    "l'app.", S["body"]))
A(Paragraph("La lista dei desideri (punto 5)", S["h3"]))
A(Paragraph(
    "La realizzo salvandola nel browser: l'utente aggiunge al cuore senza registrarsi e "
    "la ritrova quando torna. Non si sincronizza fra telefono e computer — per quello "
    "servirebbe il login obbligatorio e un'app, con parecchio attrito in più. Per ora la "
    "versione leggera è quella giusta; se i dati diranno che viene usata molto, la "
    "facciamo evolvere.", S["body"]))

# --- ordine di lavoro --------------------------------------------------------
A(section("Organizzazione", "Ordine di lavoro"))
A(data_table(
    ["Fase", "Io — tema", "Tu — admin"],
    [
        ["Ora",
         "Riquadro rassicurazione · Messaggio spedizione gratuita in scheda · Nuovi "
         "accordion · Lista dei desideri · <b>Navigazione colori in scheda prodotto</b>",
         "<b>G1</b> app recensioni<br/><b>G2</b> soglie spedizione<br/>"
         "<b>G5</b> richiesta misure al cliente"],
        ["Poi",
         "Guida alle taglie · Completa il look · Riorganizzazione prodotti simili",
         "<b>G3</b> verifica PayPal<br/><b>G4</b> gift card<br/>"
         "<b>G7</b> titoli duplicati nei gruppi colore"],
        ["Infine",
         "Stelle in scheda e griglie · Domande frequenti per categoria",
         "<b>G6</b> rifinitura abbinamenti"],
    ],
    widths=[70, 230, 195], first_bold=True))
A(Spacer(1, 11))
A(callout([
    "<b>Quando puoi, fammi sapere due cose:</b> se <b>139 €</b> è la soglia giusta "
    "(<b>G2</b>) — te lo chiedo perché è <i>già scritta sul sito</i>, non perché devo "
    "ancora scriverla — e se te la senti di chiedere tu le misure al cliente oppure "
    "preferisci che prepari io la richiesta da girargli (<b>G5</b>). Sono le uniche due "
    "che mi tengono fermo del lavoro.",
]))

A(Spacer(1, 14))
A(HRule(space_before=0, space_after=7))
A(Paragraph(f"Documento redatto da Michele Cristallo — TwoBee · {DATA_DOC}, "
            f"revisione 2 del {DATA_REV}", S["credit"]))
A(Paragraph("Riferimento: «Possibili modifiche per l'e-commerce di Sartoria Condotti» · "
            "Verifiche e audit sistema colori effettuati sullo store Sartoria Condotti "
            "Napoli", S["credit"]))

# --- passa al template "rest" dopo la prima pagina ---------------------------
story.insert(0, Spacer(0, 0))


def go():
    from reportlab.platypus.doctemplate import NextPageTemplate
    story.insert(1, NextPageTemplate("rest"))
    build(story)
    print(f"Scritto: {OUT}")


if __name__ == "__main__":
    go()
