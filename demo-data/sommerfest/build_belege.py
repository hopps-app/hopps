#!/usr/bin/env python3
"""Erzeugt die HTML-Belege fuers Sommerfest (werden anschliessend per Chrome zu PDF gerendert)."""
import os

OUT = "belege"
os.makedirs(OUT, exist_ok=True)

STYLE = """
<style>
  @page { size: A4; margin: 20mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1f2328; font-size: 12px; line-height: 1.5; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #7E3FB4; padding-bottom: 12px; margin-bottom: 24px; }
  .head .brand { font-size: 20px; font-weight: 700; color: #7E3FB4; }
  .head .sub { color: #57606a; font-size: 11px; }
  .meta { text-align: right; font-size: 11px; color: #57606a; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 28px; }
  .parties .box { width: 48%; }
  .label { text-transform: uppercase; letter-spacing: .06em; font-size: 9px; color: #8b949e; margin-bottom: 4px; }
  h1 { font-size: 17px; margin: 0 0 4px; }
  table.items { width: 100%; border-collapse: collapse; margin: 8px 0 16px; }
  table.items th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #57606a; border-bottom: 2px solid #d0d7de; padding: 6px 4px; }
  table.items td { padding: 7px 4px; border-bottom: 1px solid #eaeef2; }
  .r { text-align: right; white-space: nowrap; }
  .c { text-align: center; }
  .totals { width: 46%; margin-left: auto; }
  .totals td { padding: 5px 4px; }
  .totals .grand td { border-top: 2px solid #1f2328; font-weight: 700; font-size: 14px; padding-top: 8px; }
  .note { background: #f6f0fb; border-left: 3px solid #7E3FB4; padding: 10px 14px; margin: 18px 0; font-size: 11px; }
  .foot { margin-top: 40px; border-top: 1px solid #eaeef2; padding-top: 10px; color: #8b949e; font-size: 9.5px; display: flex; justify-content: space-between; }
  .receipt { max-width: 340px; margin: 0 auto; border: 1px dashed #b0b0b0; padding: 18px 22px; }
  .receipt h2 { text-align: center; font-size: 15px; margin: 0 0 2px; }
  .receipt .addr { text-align: center; font-size: 10px; color: #57606a; margin-bottom: 12px; }
  .receipt table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .receipt td { padding: 3px 0; }
  .receipt .sep td { border-top: 1px dashed #b0b0b0; padding-top: 6px; }
  .receipt .sum td { font-weight: 700; font-size: 13px; }
  .mono { font-family: 'SF Mono', Menlo, monospace; }
  .green { color: #1a7f37; font-weight: 600; }
</style>
"""

VEREIN_FOOT = ("Theatervereine Bühnefrei e.V. · Am Kulturhof 3 · 85276 Musterstadt &nbsp;|&nbsp; "
               "Vereinsregister VR 4021 · Amtsgericht Musterstadt &nbsp;|&nbsp; "
               "Bank: Testbank · IBAN DE02 1203 0000 0000 2020 51")


def html(title, body):
    return f"<!doctype html><html lang=de><head><meta charset=utf-8><title>{title}</title>{STYLE}</head><body>{body}</body></html>"


def money(v):
    return f"{v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") + " €"


def supplier_invoice(fname, title, supplier, supplier_sub, supplier_line, inv_no, inv_date,
                     items, ust_rate, note=None, leistungsdatum=None):
    """items: list of (menge, einheit, bezeichnung, brutto_einzel). Bruttopreise, USt herausgerechnet."""
    rows = ""
    brutto = 0.0
    for menge, einheit, bez, ep in items:
        line = menge * ep
        brutto += line
        rows += (f"<tr><td class=c>{menge}</td><td>{bez}</td><td class=r>{money(ep)}</td>"
                 f"<td class=r>{money(line)}</td></tr>")
    netto = brutto / (1 + ust_rate)
    ust = brutto - netto
    leist = f"<div class=meta>Leistungsdatum: {leistungsdatum}</div>" if leistungsdatum else ""
    note_html = f"<div class=note>{note}</div>" if note else ""
    body = f"""
    <div class=head>
      <div><div class=brand>{supplier}</div><div class=sub>{supplier_sub}</div></div>
      <div class=meta>{supplier_line}</div>
    </div>
    <div class=parties>
      <div class=box><div class=label>Rechnung an</div>
        Theatervereine Bühnefrei e.V.<br>Am Kulturhof 3<br>85276 Musterstadt</div>
      <div class=box style="text-align:right">
        <div class=label>Rechnung</div>
        <div class=meta>Rechnungs-Nr.: <b>{inv_no}</b><br>Rechnungsdatum: {inv_date}{('<br>'+leist) if leistungsdatum else ''}</div>
      </div>
    </div>
    <h1>{title}</h1>
    <table class=items>
      <thead><tr><th class=c>Menge</th><th>Bezeichnung</th><th class=r>Einzelpreis</th><th class=r>Betrag</th></tr></thead>
      <tbody>{rows}</tbody>
    </table>
    <table class=totals>
      <tr><td>Nettobetrag</td><td class=r>{money(netto)}</td></tr>
      <tr><td>zzgl. USt. {int(ust_rate*100)}%</td><td class=r>{money(ust)}</td></tr>
      <tr class=grand><td>Rechnungsbetrag</td><td class=r>{money(brutto)}</td></tr>
    </table>
    {note_html}
    <div class=foot><span>{supplier}</span><span>Vielen Dank für Ihren Auftrag.</span></div>
    """
    with open(os.path.join(OUT, fname), "w", encoding="utf-8") as f:
        f.write(html(title, body))
    return brutto


def kassenbon(fname, shop, shop_addr, datum, bon_no, items, ust_rate, extra=None):
    rows = ""
    brutto = 0.0
    for menge, bez, ep in items:
        line = menge * ep
        brutto += line
        rows += f"<tr><td>{menge} x {bez}</td><td class=r>{money(line)}</td></tr>"
    netto = brutto / (1 + ust_rate)
    ust = brutto - netto
    extra_html = f"<tr class=sep><td colspan=2 style='font-size:10px;color:#57606a'>{extra}</td></tr>" if extra else ""
    body = f"""
    <div class=receipt>
      <h2>{shop}</h2>
      <div class=addr>{shop_addr}</div>
      <table>
        {rows}
        <tr class='sep sum'><td>SUMME</td><td class=r>{money(brutto)}</td></tr>
        <tr><td style='font-size:10px;color:#57606a'>Netto</td><td class=r style='font-size:10px;color:#57606a'>{money(netto)}</td></tr>
        <tr><td style='font-size:10px;color:#57606a'>enth. USt. {int(ust_rate*100)}%</td><td class=r style='font-size:10px;color:#57606a'>{money(ust)}</td></tr>
        {extra_html}
      </table>
      <div class=addr style='margin-top:14px'>
        Beleg-Nr. {bon_no} &nbsp;·&nbsp; {datum}<br>
        <span class=green>Bio &amp; regional – danke fürs Mitmachen!</span>
      </div>
    </div>
    """
    with open(os.path.join(OUT, fname), "w", encoding="utf-8") as f:
        f.write(html(shop, body))
    return brutto


# --- Fall 1: Getraenke Huber GmbH – 287,40 (1:1) ---
a = supplier_invoice(
    "beleg-A-getraenke-huber.html",
    "Getränkelieferung Sommerfest",
    "Getränke Huber GmbH", "Getränkefachgroßhandel seit 1968",
    "Industriestraße 12 · 85276 Musterstadt<br>USt-IdNr. DE811223344",
    "2026-0713", "03.07.2026", [
        (8, "Kasten", "Mineralwasser Bio 12×0,75 l (Mehrweg)", 6.20),
        (6, "Kasten", "Bio-Apfelschorle 6×1,0 l (Mehrweg)", 11.40),
        (5, "Kasten", "Alkoholfreies Weißbier 20×0,5 l", 14.90),
        (5, "Kasten", "Regionales Helles 20×0,5 l", 15.80),
        (6, "Fl.", "Bio-Orangensaft 1,0 l", 2.65),
    ], 0.19,
    note="Zahlbar innerhalb von 14 Tagen ohne Abzug. Mehrweg-Pfand wird bei Rückgabe der Leergut-Kisten gutgeschrieben.",
    leistungsdatum="03.07.2026")

# --- Fall 2: Festzeltverleih Bayer – 1.150,00 gesamt, Restzahlung 800,00 ---
b = supplier_invoice(
    "beleg-B-festzelt-bayer.html",
    "Festzelt & Ausstattung Sommerfest",
    "Festzeltverleih Bayer GmbH", "Zelte · Bühnen · Veranstaltungstechnik",
    "Zeltweg 5 · 85290 Musterdorf<br>USt-IdNr. DE815566778",
    "F-2026-118", "10.07.2026", [
        (1, "St.", "Festzelt 8×15 m inkl. Auf- und Abbau", 650.00),
        (1, "St.", "Bühnenpodest 4×3 m, höhenverstellbar", 180.00),
        (20, "Grt.", "Bierzeltgarnitur (1 Tisch + 2 Bänke)", 8.00),
        (1, "Pausch.", "Stromverteilung & Festbeleuchtung", 160.00),
    ], 0.19,
    note="<b>Zahlungsstatus:</b> Anzahlung 350,00 € (Angebot F-2026-118) am 20.06.2026 dankend erhalten. "
         "<b>Offener Restbetrag: 800,00 €</b>, fällig bis 17.07.2026.",
    leistungsdatum="11.–12.07.2026")

# --- Fall 3: drei Einzelbelege, zusammen 163,90 (eine Erstattung) ---
c1 = kassenbon(
    "beleg-C1-bioladen-gruenkern.html",
    "Bioladen Grünkern", "Marktplatz 4 · 85276 Musterstadt", "13.07.2026", "BON-2026-4471", [
        (6, "Vegane Grillbratlinge 4er", 4.49),
        (4, "Gemüse-Grillspieße", 3.90),
        (5, "Tofu-Bratwurst 5er", 2.79),
        (3, "Veganer Kartoffelsalat 500 g", 4.20),
        (3, "Salatmix / Tomaten / Gurken", 3.17),
    ], 0.07, extra="Bezahlt: Miriam Bühnemann (Vorstand) – Auslage Sommerfest")

c2 = kassenbon(
    "beleg-C2-baeckerei-koernerhof.html",
    "Bäckerei Körnerhof", "Backgasse 2 · 85276 Musterstadt", "14.07.2026", "K-88231", [
        (2, "Blechkuchen Apfel (vegan)", 9.50),
        (1, "Marmorkuchen", 8.90),
        (40, "Körnerbrötchen", 0.46),
    ], 0.07, extra="Bezahlt: Miriam Bühnemann (Vorstand) – Auslage Sommerfest")

c3 = supplier_invoice(
    "beleg-C3-mehrweg-geschirrmobil.html",
    "Mehrweggeschirr-Verleih Sommerfest",
    "Mehrweg-Geschirrmobil", "Nachhaltige Veranstaltungslogistik",
    "Rückgabeweg 7 · 85276 Musterstadt<br>USt-IdNr. DE812009911",
    "MG-2026-0342", "14.07.2026", [
        (1, "Set", "Mehrweggeschirr für 100 Gäste (Teller, Besteck, Gläser), 1 Tag", 30.00),
        (1, "Pausch.", "Spül- und Reinigungspauschale", 9.00),
    ], 0.19,
    note="<span class=green>0 % Einweg – 100 % Mehrweg.</span> Bezahlt durch Miriam Bühnemann (Vorstand), "
         "Erstattung über Vereinskonto.",
    leistungsdatum="12.07.2026")

# --- Fall 4: Spendenquittung / Zuwendungsbestaetigung – 250,00 ---
spende_body = f"""
<div class=head>
  <div><div class=brand>Theatervereine Bühnefrei e.V.</div>
    <div class=sub>Am Kulturhof 3 · 85276 Musterstadt</div></div>
  <div class=meta>Steuernr. 143/210/40021<br>Musterstadt, 09.07.2026</div>
</div>
<h1>Bestätigung über Geldzuwendungen / Mitgliedsbeitrag</h1>
<div class=sub style="margin-bottom:18px">im Sinne des § 10b des Einkommensteuergesetzes an eine der in § 5 Abs. 1
Nr. 9 des Körperschaftsteuergesetzes bezeichneten Körperschaften</div>

<div class=parties>
  <div class=box><div class=label>Name und Anschrift des Zuwendenden</div>
    Familie Sonnenschein<br>Gartenstraße 18<br>85276 Musterstadt</div>
  <div class=box><div class=label>Art der Zuwendung</div>
    Geldzuwendung / Spende<br>Tag der Zuwendung: <b>08.07.2026</b></div>
</div>

<table class=totals style="width:60%">
  <tr><td>Betrag der Zuwendung (in Ziffern)</td><td class=r>{money(250.0)}</td></tr>
  <tr class=grand><td>in Buchstaben</td><td class=r>zweihundertfünfzig Euro</td></tr>
</table>

<div class=note>
Es handelt sich <b>nicht</b> um den Verzicht auf Erstattung von Aufwendungen.<br>
Wir sind wegen Förderung von Kunst und Kultur nach dem Freistellungsbescheid des Finanzamts Musterstadt,
StNr. 143/210/40021, vom 14.03.2025 für den letzten Veranlagungszeitraum 2024 nach § 5 Abs. 1 Nr. 9 KStG
von der Körperschaftsteuer befreit und als steuerbegünstigten Zwecken dienend anerkannt.<br><br>
Die Zuwendung wird ausschließlich zur Förderung von Kunst und Kultur (Sommerfest) verwendet.
</div>

<div style="margin-top:36px">Musterstadt, den 09.07.2026<br><br>
_____________________________<br>
<span class=sub>Miriam Bühnemann – 1. Vorsitzende, Theatervereine Bühnefrei e.V.</span></div>

<div class=foot><span>{VEREIN_FOOT}</span></div>
"""
with open(os.path.join(OUT, "beleg-D-spendenquittung.html"), "w", encoding="utf-8") as f:
    f.write(html("Spendenquittung", spende_body))

print("Belege erzeugt:")
print("  A Getränke Huber:      %s" % money(a))
print("  B Festzelt (gesamt):    %s  (Rest 800,00)" % money(b))
print("  C1 Bioladen:            %s" % money(c1))
print("  C2 Bäckerei:            %s" % money(c2))
print("  C3 Mehrweggeschirr:     %s" % money(c3))
print("  C1+C2+C3 =              %s  (= Erstattung 163,90)" % money(c1 + c2 + c3))
print("  D Spende:               %s" % money(250.0))
