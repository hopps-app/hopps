#!/usr/bin/env python3
"""Erzeugt die PDF-Belege der Dev-Testdaten (testdata.yaml / testdata-dev.yaml).

Jeder Beleg passt zu seinem Datensatz: Absender, Datum und Betrag stimmen, die Positionen ergeben genau den Belegbetrag
(das Skript bricht sonst ab). Bei den Aufteilungs-Szenarien entsprechen die Positionen den Teilen, Rechnungsnummern und
Zahlungshinweise den Verwendungszwecken der Bankumsätze.

    pip install reportlab
    python demo-data/testdaten-belege/build_belege.py

Die PDFs landen in backend/app.hopps.org/src/main/resources/testdata/receipts und werden im Dev-Modus beim Start in den
Speicher geladen (app.hopps.testdata.receipt-files). Die Ausgabe ist reproduzierbar (invariant), ein erneuter Lauf
ändert die Dateien nur, wenn sich hier etwas ändert.
"""
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen.canvas import Canvas

OUT = Path(__file__).resolve().parents[2] / "backend/app.hopps.org/src/main/resources/testdata/receipts"

ACCENT = HexColor("#7E3FB4")
INK = HexColor("#1f2328")
MUTED = HexColor("#57606a")
FAINT = HexColor("#8b949e")
RULE = HexColor("#d0d7de")
SOFT = HexColor("#f6f0fb")

# Empfänger: der Verein aus den Testdaten (Organisation 4).
VEREIN = ["Theatervereine Bühnefrei e.V.", "Dechant-Karthaus-Straße 172", "33397 Rietberg"]

CENT = Decimal("0.01")


def d(value) -> Decimal:
    return Decimal(str(value)).quantize(CENT)


def money(value: Decimal) -> str:
    s = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{s} €"


def price_str(price) -> str:
    """Unit price as printed: two decimals, three for prices like fuel (1,759 €/l)."""
    p = Decimal(str(price))
    places = 3 if p != p.quantize(CENT) else 2
    s = f"{p:,.{places}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{s} €"


def qty_str(q) -> str:
    q = Decimal(str(q))
    return f"{q:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".") if q != q.to_integral() else str(int(q))


def line_total(item) -> Decimal:
    qty, _unit, _text, price, _rate = item
    return (Decimal(str(qty)) * Decimal(str(price))).quantize(CENT, ROUND_HALF_UP)


def vat_breakdown(items):
    """Enthaltene Umsatzsteuer je Satz, aus Bruttobeträgen herausgerechnet: [(satz, brutto, netto, steuer)]."""
    by_rate = {}
    for item in items:
        by_rate[item[4]] = by_rate.get(item[4], Decimal(0)) + line_total(item)
    rows = []
    for rate in sorted(by_rate, reverse=True):
        gross = by_rate[rate]
        net = (gross / (1 + Decimal(rate) / 100)).quantize(CENT, ROUND_HALF_UP)
        rows.append((rate, gross, net, gross - net))
    return rows


def check_total(spec, items):
    total = sum((line_total(i) for i in items), Decimal(0))
    if total != d(spec["total"]):
        raise SystemExit(f"{spec['file']}: Positionen ergeben {total}, Beleg sagt {spec['total']}")
    return total


# ─── Rechnung (A4) ─────────────────────────────────────────────────────────────────────────────────────────────────


def invoice(c: Canvas, spec):
    items = [i for section in spec["sections"] for i in section[1]]
    total = check_total(spec, items)
    w, h = A4
    left, right = 20 * mm, w - 20 * mm

    # Briefkopf
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(left, h - 28 * mm, spec["vendor"])
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(left, h - 33 * mm, spec.get("tagline", ""))
    for i, line in enumerate(spec["vendor_lines"]):
        c.drawRightString(right, h - 24 * mm - i * 4.2 * mm, line)
    c.setStrokeColor(ACCENT)
    c.setLineWidth(2)
    c.line(left, h - 37 * mm, right, h - 37 * mm)

    # Empfänger und Rechnungsdaten
    y = h - 50 * mm
    c.setFont("Helvetica", 7)
    c.setFillColor(FAINT)
    c.drawString(left, y + 6 * mm, f"{spec['vendor']} · {spec['vendor_lines'][0]}")
    c.setFillColor(INK)
    c.setFont("Helvetica", 10.5)
    for i, line in enumerate(VEREIN):
        c.drawString(left, y - i * 5 * mm, line)
    meta = [(spec.get("number_label", "Rechnungs-Nr."), spec["number"]), (spec.get("date_label", "Datum"), spec["date"])]
    meta += spec.get("meta", [])
    for i, (label, value) in enumerate(meta):
        c.setFont("Helvetica", 9)
        c.setFillColor(MUTED)
        c.drawRightString(right - 42 * mm, y - i * 5 * mm, label)
        c.setFont("Helvetica-Bold", 9.5)
        c.setFillColor(INK)
        c.drawRightString(right, y - i * 5 * mm, value)

    # Titel
    y = h - 85 * mm
    c.setFont("Helvetica-Bold", 14)
    c.drawString(left, y, spec["title"])
    if spec.get("intro"):
        c.setFont("Helvetica", 9.5)
        c.setFillColor(MUTED)
        c.drawString(left, y - 6 * mm, spec["intro"])
        c.setFillColor(INK)
        y -= 6 * mm

    # Positionen
    y -= 11 * mm
    cols = (left, left + 16 * mm, right - 45 * mm, right)
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(MUTED)
    c.drawString(cols[0], y, "MENGE")
    c.drawString(cols[1], y, "BEZEICHNUNG")
    c.drawRightString(cols[2], y, "EINZELPREIS")
    c.drawRightString(cols[3], y, "BETRAG")
    c.setStrokeColor(RULE)
    c.setLineWidth(1)
    c.line(left, y - 2.5 * mm, right, y - 2.5 * mm)
    y -= 8 * mm
    c.setFillColor(INK)
    for heading, section_items in spec["sections"]:
        if heading:
            c.setFont("Helvetica-Bold", 9.5)
            c.drawString(cols[1], y, heading)
            y -= 5.5 * mm
        for item in section_items:
            qty, unit, text, price, _rate = item
            c.setFont("Helvetica", 9.5)
            c.drawString(cols[0], y, f"{qty_str(qty)} {unit}".strip())
            c.drawString(cols[1], y, text)
            c.drawRightString(cols[2], y, price_str(price))
            c.drawRightString(cols[3], y, money(line_total(item)))
            y -= 6 * mm
        if heading and len(spec["sections"]) > 1:
            c.setFont("Helvetica", 8.5)
            c.setFillColor(MUTED)
            subtotal = sum((line_total(i) for i in section_items), Decimal(0))
            c.drawRightString(cols[3], y + 1 * mm, f"Zwischensumme {money(subtotal)}")
            c.setFillColor(INK)
            y -= 5 * mm
    c.setStrokeColor(RULE)
    c.line(left, y + 2 * mm, right, y + 2 * mm)

    # Summen
    y -= 5 * mm
    box_left = right - 75 * mm
    vat = vat_breakdown(items) if not spec.get("vat_free") else []
    for rate, gross, net, tax in vat:
        c.setFont("Helvetica", 9)
        c.setFillColor(MUTED)
        c.drawString(box_left, y, f"Netto {rate} %")
        c.drawRightString(right, y, money(net))
        y -= 5 * mm
        c.drawString(box_left, y, f"enthaltene USt. {rate} %")
        c.drawRightString(right, y, money(tax))
        y -= 5 * mm
    if spec.get("vat_free"):
        c.setFont("Helvetica", 8.5)
        c.setFillColor(MUTED)
        c.drawString(box_left, y, spec["vat_free"])
        y -= 5 * mm
    c.setStrokeColor(INK)
    c.setLineWidth(1.5)
    c.line(box_left, y + 2 * mm, right, y + 2 * mm)
    y -= 4 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(box_left, y, spec.get("total_label", "Rechnungsbetrag"))
    c.drawRightString(right, y, money(total))

    # Zahlungshinweis
    if spec.get("note"):
        y -= 16 * mm
        lines = spec["note"]
        box_h = (len(lines) * 5 + 6) * mm
        c.setFillColor(SOFT)
        c.rect(left, y - box_h + 6 * mm, right - left, box_h, stroke=0, fill=1)
        c.setFillColor(ACCENT)
        c.rect(left, y - box_h + 6 * mm, 1.2 * mm, box_h, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont("Helvetica", 9.5)
        for i, line in enumerate(lines):
            c.drawString(left + 5 * mm, y - i * 5 * mm, line)

    # Fußzeile
    c.setStrokeColor(RULE)
    c.setLineWidth(0.8)
    c.line(left, 22 * mm, right, 22 * mm)
    c.setFont("Helvetica", 7.5)
    c.setFillColor(FAINT)
    for i, line in enumerate(spec.get("footer", [])):
        c.drawString(left, 17 * mm - i * 3.8 * mm, line)


# ─── Kassenbon (80 mm Thermopapier) ────────────────────────────────────────────────────────────────────────────────


def bon(c: Canvas, spec, width, height):
    items = spec["items"]
    total = check_total(spec, items)
    left, right = 6 * mm, width - 6 * mm
    y = height - 12 * mm
    c.setFillColor(INK)
    c.setFont("Courier-Bold", 12)
    c.drawCentredString(width / 2, y, spec["vendor"])
    c.setFont("Courier", 8)
    for line in spec["vendor_lines"]:
        y -= 4 * mm
        c.drawCentredString(width / 2, y, line)
    y -= 7 * mm
    c.setDash(1, 2)
    c.line(left, y + 3 * mm, right, y + 3 * mm)
    c.setDash()
    c.setFont("Courier", 8.5)
    for item in items:
        qty, unit, text, price, rate = item
        tag = "A" if rate == 19 else "B"
        c.drawString(left, y, text[:32])
        if Decimal(str(qty)) != 1 or unit:
            y -= 3.8 * mm
            c.drawString(left + 3 * mm, y, f"{qty_str(qty)} {unit} x {price_str(price)}".replace("  ", " "))
        c.drawRightString(right, y, f"{money(line_total(item))} {tag}")
        y -= 4.6 * mm
    c.setDash(1, 2)
    c.line(left, y + 2.5 * mm, right, y + 2.5 * mm)
    c.setDash()
    y -= 2 * mm
    c.setFont("Courier-Bold", 11)
    c.drawString(left, y, "SUMME EUR")
    c.drawRightString(right, y, money(total).replace(" €", ""))
    y -= 6 * mm
    c.setFont("Courier", 8.5)
    c.drawString(left, y, spec.get("payment", "Kartenzahlung"))
    c.drawRightString(right, y, money(total).replace(" €", ""))
    y -= 7 * mm
    c.setFont("Courier", 7.5)
    c.drawString(left, y, "USt      Netto      Steuer     Brutto")
    for rate, gross, net, tax in vat_breakdown(items):
        y -= 3.6 * mm
        tag = "A" if rate == 19 else "B"
        c.drawString(left, y, f"{tag} {rate:>2}% {money(net):>11}{money(tax):>11}{money(gross):>11}".replace(" €", ""))
    y -= 8 * mm
    c.setFont("Courier", 7.5)
    for line in spec.get("bottom", []):
        c.drawCentredString(width / 2, y, line)
        y -= 3.6 * mm
    c.drawCentredString(width / 2, y, f"{spec['date']}  {spec.get('time', '')}  Bon {spec['number']}")
    if y < 4 * mm:
        raise SystemExit(f"{spec['file']}: Bon zu kurz, Inhalt abgeschnitten")


def bon_height(spec):
    lines = sum(2 if (Decimal(str(i[0])) != 1 or i[1]) else 1 for i in spec["items"])
    rates = len({i[4] for i in spec["items"]})
    return (52 + len(spec["vendor_lines"]) * 4 + lines * 4.4 + rates * 3.6 + len(spec.get("bottom", [])) * 3.6) * mm


# ─── Schreiben (Bescheid, Spendenbrief, Kassenbericht) ─────────────────────────────────────────────────────────────


def letter(c: Canvas, spec):
    w, h = A4
    left, right = 22 * mm, w - 22 * mm
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(left, h - 28 * mm, spec["vendor"])
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    for i, line in enumerate(spec["vendor_lines"]):
        c.drawString(left, h - 34 * mm - i * 4.2 * mm, line)
    y = h - 62 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica", 10.5)
    for i, line in enumerate(VEREIN):
        c.drawString(left, y - i * 5 * mm, line)
    c.setFont("Helvetica", 9.5)
    c.drawRightString(right, y, f"{spec.get('place', '')}, {spec['date']}".lstrip(", "))
    if spec.get("number"):
        c.setFillColor(MUTED)
        c.drawRightString(right, y - 5 * mm, f"{spec.get('number_label', 'Aktenzeichen')}: {spec['number']}")
        c.setFillColor(INK)
    y -= 30 * mm
    c.setFont("Helvetica-Bold", 13)
    c.drawString(left, y, spec["title"])
    y -= 10 * mm
    c.setFont("Helvetica", 10.5)
    for paragraph in spec["body"]:
        for line in paragraph:
            c.drawString(left, y, line)
            y -= 5.4 * mm
        y -= 3 * mm
    if spec.get("table"):
        items = spec["table"]
        total = check_total(spec, items)
        y -= 2 * mm
        for item in items:
            qty, unit, text, price, _rate = item
            c.drawString(left + 4 * mm, y, f"{qty_str(qty)} {unit} {text}".strip())
            c.drawRightString(right - 40 * mm, y, f"je {price_str(price)}")
            c.drawRightString(right, y, money(line_total(item)))
            y -= 6 * mm
        c.setLineWidth(1.2)
        c.line(right - 70 * mm, y + 3 * mm, right, y + 3 * mm)
        c.setFont("Helvetica-Bold", 11.5)
        y -= 2 * mm
        c.drawString(right - 70 * mm, y, spec.get("total_label", "Summe"))
        c.drawRightString(right, y, money(total))
        c.setFont("Helvetica", 10.5)
        y -= 12 * mm
    else:
        y -= 2 * mm
        c.setFillColor(SOFT)
        c.rect(left, y - 4 * mm, right - left, 14 * mm, stroke=0, fill=1)
        c.setFillColor(INK)
        c.setFont("Helvetica-Bold", 12)
        c.drawString(left + 5 * mm, y + 1 * mm, spec.get("total_label", "Betrag"))
        c.drawRightString(right - 5 * mm, y + 1 * mm, money(d(spec["total"])))
        c.setFont("Helvetica", 10.5)
        y -= 18 * mm
    for paragraph in spec.get("closing", []):
        for line in paragraph:
            c.drawString(left, y, line)
            y -= 5.4 * mm
        y -= 3 * mm
    y -= 12 * mm
    c.setLineWidth(0.6)
    c.line(left, y, left + 60 * mm, y)
    c.setFont("Helvetica", 9)
    c.setFillColor(MUTED)
    c.drawString(left, y - 4.5 * mm, spec.get("signature", ""))


# ─── Belege ────────────────────────────────────────────────────────────────────────────────────────────────────────

A, B = 19, 7  # Umsatzsteuersätze

BANK_FOOTER = "Bankverbindung: IBAN {} · BIC {}"

RECEIPTS = [
    # testdata.yaml: Belege der bestätigten Februar-Transaktionen 1–5
    dict(file="beleg-office-depot.pdf", kind="invoice", vendor="Office Depot GmbH", tagline="Bürobedarf für Unternehmen und Vereine",
         vendor_lines=["Linzer Straße 9", "33100 Paderborn", "USt-IdNr. DE287654321"], number="OD-2026-10482", date="01.02.2026",
         title="Rechnung Bürobedarf", total=125.50,
         sections=[(None, [(2, "Pak.", "Kopierpapier A4, 5 × 500 Blatt", 24.95, A),
                           (1, "St.", "Toner schwarz für Laserdrucker", 59.90, A),
                           (10, "St.", "Ordner A4, 8 cm Rücken", 1.57, A)])],
         note=["Betrag dankend per Lastschrift erhalten."],
         footer=["Office Depot GmbH · Linzer Straße 9 · 33100 Paderborn · Amtsgericht Paderborn HRB 4711",
                 BANK_FOOTER.format("DE27 4765 0130 0000 1122 33", "WELADE3LXXX")]),
    dict(file="beleg-kaffeemaschine.pdf", kind="invoice", vendor="Tech Store AG", tagline="Elektronik & Haushaltsgeräte",
         vendor_lines=["Bielefelder Straße 120", "33330 Gütersloh", "USt-IdNr. DE298765432"], number="TS-882103", date="02.02.2026",
         title="Rechnung Kaffeevollautomat Kiosk", total=450.00,
         sections=[(None, [(1, "St.", "Kaffeevollautomat Barista Pro, Edelstahl", 429.00, A),
                           (3, "Fl.", "Entkalker 500 ml", 7.00, A)])],
         note=["Zahlbar innerhalb von 14 Tagen ohne Abzug.", "2 Jahre Herstellergarantie, Rechnung bitte aufbewahren."],
         footer=["Tech Store AG · Bielefelder Straße 120 · 33330 Gütersloh · Amtsgericht Gütersloh HRB 9921",
                 BANK_FOOTER.format("DE64 4785 0065 0000 4455 66", "WELADED1GTL")]),
    dict(file="beleg-miete-februar.pdf", kind="invoice", vendor="Property Management Ltd", tagline="Hausverwaltung",
         vendor_lines=["Rathausstraße 4", "33397 Rietberg"], number="MV-2026-02-17", number_label="Beleg-Nr.", date="03.02.2026",
         title="Mietbeleg Februar 2026", intro="Proberaum und Lager, Kulturhalle Rietberg, Mietvertrag vom 01.03.2024",
         total=1500.00, vat_free="Umsatzsteuerfrei nach § 4 Nr. 12 UStG", total_label="Monatsmiete",
         sections=[(None, [(1, "", "Grundmiete Februar 2026", 1250.00, 0),
                           (1, "", "Nebenkostenvorauszahlung Februar 2026", 250.00, 0)])],
         note=["Fällig zum 3. Werktag des Monats auf das unten genannte Konto."],
         footer=["Property Management Ltd · Rathausstraße 4 · 33397 Rietberg",
                 BANK_FOOTER.format("DE11 4786 0125 0000 7788 99", "GENODEM1GTL")]),
    dict(file="beleg-workshop-material.pdf", kind="invoice", vendor="Craft Supplies Inc", tagline="Künstler- und Bastelbedarf",
         vendor_lines=["Lange Straße 33", "33378 Rheda-Wiedenbrück", "USt-IdNr. DE301234567"], number="CS-26-0391", date="04.02.2026",
         title="Rechnung Workshop-Material", total=275.30,
         sections=[(None, [(5, "Set", "Acrylfarben, 12 Farben à 75 ml", 18.90, A),
                           (10, "Set", "Pinselset Kunsthaar, 10-teilig", 6.49, A),
                           (10, "St.", "Keilrahmen 30 × 40 cm", 11.59, A)])],
         note=["Zahlbar innerhalb von 14 Tagen ohne Abzug."],
         footer=["Craft Supplies Inc · Lange Straße 33 · 33378 Rheda-Wiedenbrück",
                 BANK_FOOTER.format("DE45 4785 0065 0000 3344 55", "WELADED1GTL")]),
    dict(file="beleg-foerderbescheid.pdf", kind="letter", vendor="City Council", vendor_lines=["Kulturamt", "Rathausstraße 36", "33397 Rietberg"],
         place="Rietberg", date="05.02.2026", number="KA-2026-014", title="Zuwendungsbescheid Projektförderung 2026", total=5000.00,
         total_label="Bewilligte Zuwendung",
         body=[["Sehr geehrte Damen und Herren,"],
               ["auf Ihren Antrag vom 12.01.2026 bewilligen wir Ihnen für das Theaterprojekt",
                "„Spielzeit 2026“ eine Zuwendung als Festbetragsfinanzierung in folgender Höhe:"]],
         closing=[["Die Zuwendung wird auf das uns bekannte Vereinskonto überwiesen. Der Verwendungsnachweis",
                   "ist bis zum 31.03.2027 vorzulegen."], ["Mit freundlichen Grüßen"]],
         signature="Im Auftrag, Kulturamt"),

    # testdata-dev.yaml: Belege zur Prüfung (201–210)
    dict(file="metro-grosseinkauf.pdf", kind="bon", vendor="METRO", vendor_lines=["METRO Deutschland GmbH", "Großmarkt Ingolstadt",
         "Manchinger Straße 115, 85053 Ingolstadt"], number="4711-0902", date="02.09.2026", time="10:15", total=842.60,
         payment="EC-Karte", bottom=["Kunden-Nr. 211 004 815", "Vielen Dank für Ihren Einkauf!"],
         items=[(6, "Ki", "Apfelschorle 12x1,0 l", 11.49, A), (8, "Ki", "Mineralwasser 12x0,75 l", 6.99, A),
                (5, "Ki", "Cola 12x1,0 l", 13.99, A), (6, "Ki", "Bier Helles 20x0,5 l", 17.99, A),
                (25, "St", "Pfand Kiste", 3.30, A), (4, "Btl", "Brezeln TK 50 St.", 19.99, B),
                (6, "Kt", "Chips Paprika 10x175 g", 12.49, B), (2, "Ds", "Fruchtgummi 3 kg", 14.99, B),
                (3, "Pk", "Grillwürstchen 60 St.", 29.99, B), (3, "Btl", "Eiswürfel 2 kg", 5.21, B),
                (4, "Pk", "Pappteller 100 St.", 6.49, A), (3, "Pk", "Servietten 250 St.", 4.99, A),
                (2, "St", "Lichterkette Outdoor 20 m", 34.99, A), (4, "Sk", "Holzkohle 10 kg", 13.99, A)]),
    dict(file="hornbach-buehnenbau.pdf", kind="bon", vendor="HORNBACH", vendor_lines=["Hornbach Baumarkt AG", "Markt Ingolstadt",
         "Am Westpark 4, 85057 Ingolstadt"], number="0903-1640", date="03.09.2026", time="16:40", total=186.40, payment="Kartenzahlung",
         bottom=["Rückgabe innerhalb 30 Tagen mit Bon"],
         items=[(10, "St", "Rahmenholz 44x68 mm 2,5 m", 6.49, A), (2, "St", "Sperrholz 15 mm 125x62", 29.95, A),
                (1, "", "Spax 4x40 500 St.", 14.95, A), (1, "", "Acryllack schwarz 2,5 l", 24.95, A),
                (3, "Sk", "Blumenerde 40 l", 4.95, A), (1, "", "Gartenhandschuhe Gr. 9", 6.85, A)]),
    dict(file="getraenke-huber-lieferung.pdf", kind="invoice", vendor="Getränke Huber", tagline="Getränkefachgroßhandel seit 1968",
         vendor_lines=["Industriestraße 12", "85276 Pfaffenhofen a. d. Ilm", "USt-IdNr. DE811223344"], number="2026-0904",
         date="04.09.2026", meta=[("Lieferung", "04.09.2026")], title="Getränkelieferung Kiosk", total=412.00,
         sections=[(None, [(8, "Ki", "Helles 20 × 0,5 l", 18.50, A), (4, "Ki", "Spezi 20 × 0,5 l", 15.90, A),
                           (6, "Ki", "Apfelschorle 12 × 0,7 l", 9.80, A), (6, "Ki", "Mineralwasser 12 × 0,7 l", 7.60, A),
                           (24, "Ki", "Pfand Kiste mit Flaschen", 4.00, A)])],
         note=["Zahlbar innerhalb von 10 Tagen ohne Abzug.", "Leergut bitte bei der nächsten Lieferung mitgeben."],
         footer=["Getränke Huber · Industriestraße 12 · 85276 Pfaffenhofen a. d. Ilm",
                 BANK_FOOTER.format("DE21 7215 1650 0000 2468 10", "BYLADEM1PAF")]),
    dict(file="druckerei-schmid-plakate.pdf", kind="invoice", vendor="Druckerei Schmid", tagline="Offset- und Digitaldruck",
         vendor_lines=["Hauptplatz 21", "85276 Pfaffenhofen a. d. Ilm", "USt-IdNr. DE812345678"], number="RE 4398", date="05.09.2026",
         title="Plakate und Flyer Premiere „Der kleine Lord“", total=238.00,
         sections=[(None, [(50, "St.", "Plakat A2, 4/0-farbig, 170 g matt", 2.60, A),
                           (1, "Aufl.", "Flyer A6, 1.000 Stück, 4/4-farbig", 108.00, A)])],
         note=["Zahlbar innerhalb von 14 Tagen ohne Abzug."],
         footer=["Druckerei Schmid · Hauptplatz 21 · 85276 Pfaffenhofen a. d. Ilm",
                 BANK_FOOTER.format("DE90 7215 1650 0000 1357 91", "BYLADEM1PAF")]),
    dict(file="abendkasse-premiere.pdf", kind="letter", vendor="Abendkasse", vendor_lines=["Theatervereine Bühnefrei e.V.",
         "Kassenbericht"], place="Rietberg", date="06.09.2026", number="AK-2026-09-06", number_label="Kassenbericht",
         title="Kassenabrechnung Premiere „Der kleine Lord“", total=1260.00, total_label="Einnahmen",
         body=[["Vorstellung am 06.09.2026, 19:30 Uhr, Kulturhalle. Wechselgeld 150,00 € zurückgelegt."]],
         table=[(60, "×", "Eintrittskarte Erwachsene", 17.00, 0), (20, "×", "Eintrittskarte ermäßigt", 12.00, 0)],
         closing=[["Der Betrag wurde am 08.09.2026 bar auf das Vereinskonto eingezahlt."]],
         signature="Kassenwart / zweite Kassenprüferin"),
    dict(file="spende-sparkasse.pdf", kind="letter", vendor="Sparkasse Pfaffenhofen", vendor_lines=["Hauptplatz 1",
         "85276 Pfaffenhofen a. d. Ilm"], place="Pfaffenhofen", date="08.09.2026", number="PS-2026-117",
         title="Spende aus dem PS-Zweckertrag", total=500.00, total_label="Spende",
         body=[["Sehr geehrte Damen und Herren,"],
               ["wir freuen uns, Ihre Kinder- und Jugendarbeit im Theater mit einer Spende aus dem",
                "Zweckertrag des PS-Lotteriesparens zu unterstützen:"]],
         closing=[["Der Betrag wird in den nächsten Tagen auf Ihr Vereinskonto überwiesen."],
                  ["Viel Erfolg für die neue Spielzeit!"]],
         signature="Sparkasse Pfaffenhofen, Vorstand"),
    dict(file="tankquittung-aral.pdf", kind="bon", vendor="ARAL", vendor_lines=["Aral Tankstelle", "Ingolstädter Straße 50",
         "85276 Pfaffenhofen a. d. Ilm"], number="5521", date="09.09.2026", time="07:45", total=78.45, payment="Girocard",
         bottom=["Säule 4", "Gute Fahrt!"], items=[(44.60, "l", "Diesel", 1.759, A)]),
    dict(file="kostuemverleih.pdf", kind="invoice", vendor="Kostümfundus Bayern", tagline="Theater- und Filmkostüme zum Verleih",
         vendor_lines=["Schleißheimer Straße 77", "80797 München", "USt-IdNr. DE813579246"], number="KF-2026-0910", date="10.09.2026",
         meta=[("Leihzeitraum", "12.09.–10.10.2026")], title="Kostümverleih „Das Hässliche Entlein“", total=350.00,
         sections=[(None, [(1, "Set", "Kostümset Entenfamilie (6 Kostüme, Größen S–L), 4 Wochen", 290.00, A),
                           (1, "", "Reinigungspauschale", 60.00, A)])],
         note=["Anzahlung 200,00 € bei Abholung, Restbetrag 150,00 € bei Rückgabe.",
               "Bitte Kostüme vollständig und gereinigt zurückgeben."],
         footer=["Kostümfundus Bayern · Schleißheimer Straße 77 · 80797 München",
                 BANK_FOOTER.format("DE33 7015 0000 0000 9876 54", "SSKMDEMMXXX")]),
    dict(file="hotel-gastspiel.pdf", kind="invoice", vendor="Hotel Goldenes Kreuz", tagline="Gasthof und Hotel seit 1872",
         vendor_lines=["Goldene-Bären-Straße 8", "93047 Regensburg", "USt-IdNr. DE814682468"], number="H-26-3381", date="11.09.2026",
         meta=[("Aufenthalt", "09.–11.09.2026")], title="Rechnung Gastspiel Regensburg, Ensemble Bühnefrei",
         intro="7 Einzelzimmer, 2 Nächte", total=1120.00,
         sections=[(None, [(14, "N.", "Übernachtung Einzelzimmer", 68.00, B),
                           (14, "×", "Frühstücksbuffet", 12.00, A)])],
         note=["Zahlbar innerhalb von 14 Tagen ohne Abzug."],
         footer=["Hotel Goldenes Kreuz · Goldene-Bären-Straße 8 · 93047 Regensburg",
                 BANK_FOOTER.format("DE77 7505 0000 0000 3141 59", "BYLADEM1RBG")]),
    dict(file="scan-0815.pdf", kind="bon", scanned=True, vendor="Musikhaus Fuchs", vendor_lines=["Ludwigstraße 12",
         "85049 Ingolstadt"], number="0815", date="12.09.2026", time="18:30", total=64.90, payment="Bar",
         bottom=["Vielen Dank!"],
         items=[(2, "Sa", "Gitarrensaiten Nylon", 12.90, A), (1, "", "XLR-Kabel 5 m", 19.90, A), (1, "", "Notenständer", 19.20, A)]),

    # testdata-dev.yaml: Aufteilungs-Szenarien (211–216)
    dict(file="edeka-probenwochenende.pdf", kind="bon", vendor="EDEKA Center", vendor_lines=["Pfaffenhofen a. d. Ilm",
         "Hohenwarter Straße 30"], number="9158", date="15.09.2026", time="17:20", total=386.50, payment="EC-Karte",
         bottom=["Wir lieben Lebensmittel."],
         items=[(6, "Ki", "Mineralwasser 6x1,5 l", 4.99, A), (8, "Ki", "Apfelsaft 6x1,0 l", 8.49, A),
                (4, "Ki", "Cola 6x1,5 l", 11.11, A), (10, "", "Salzbrezeln 250 g", 1.89, B),
                (12, "", "Butterkekse 400 g", 2.29, B), (6, "", "Studentenfutter 500 g", 2.97, B),
                (3, "", "Platte belegte Brötchen", 39.90, B), (2, "", "Platte Obst und Gemüse", 24.90, B),
                (1, "", "Kaffee gemahlen 1 kg", 10.50, B)]),
    dict(file="selgros-premierenfeier.pdf", kind="bon", vendor="SELGROS", vendor_lines=["Selgros Cash & Carry",
         "Großmarkt Ingolstadt", "Ettinger Straße 107, 85057 Ingolstadt"], number="2209-1505", date="17.09.2026",
         time="15:05", total=624.80, payment="EC-Karte", bottom=["Kunden-Nr. 77 104 220"],
         items=[(8, "Ki", "Bier Helles 20x0,5 l", 17.49, A), (6, "Ki", "Spezi 12x1,0 l", 12.99, A),
                (6, "Ki", "Mineralwasser 12x0,75 l", 8.99, A), (2, "Ki", "Apfelschorle 12x0,5 l", 13.30, A),
                (3, "Btl", "Brezeln TK 50 St.", 19.99, B), (6, "Kt", "Chips 10x125 g", 6.49, B),
                (3, "Ds", "Nussmischung 1 kg", 5.83, B), (4, "Kt", "Sekt trocken 6x0,75 l", 29.94, A),
                (2, "", "Fingerfood-Platte 40 St.", 45.12, B)]),
    dict(file="buehnentechnik-sammelrechnung.pdf", kind="invoice", vendor="Bühnentechnik Ingolstadt GmbH",
         tagline="Licht · Ton · Rigging · Verleih", vendor_lines=["Despag-Straße 3", "85055 Ingolstadt", "USt-IdNr. DE815975310"],
         number="RE 2026-118", date="19.09.2026", title="Sammelrechnung Ton- und Lichtverleih", total=1050.00,
         intro="Drei Produktionen, bitte jede Position einzeln überweisen.",
         sections=[("Pos. 1 – Der kleine Lord", [(1, "", "Lichtpaket 12 LED-Scheinwerfer, Pult, 2 Wochen", 420.00, A)]),
                   ("Pos. 2 – König der Löwen", [(1, "", "Tonanlage 2 × 1 kW mit Monitoring, 2 Wochen", 380.00, A)]),
                   ("Pos. 3 – Workshops", [(4, "St.", "Funkmikrofon Headset, Workshop-Reihe", 62.50, A)])],
         note=["Bitte je Position mit Verwendungszweck „RE 2026-118 Pos. 1“ bis „Pos. 3“ überweisen.",
               "Zahlbar innerhalb von 14 Tagen ohne Abzug."],
         footer=["Bühnentechnik Ingolstadt GmbH · Despag-Straße 3 · 85055 Ingolstadt · HRB 7788",
                 BANK_FOOTER.format("DE58 7215 0000 0000 6543 21", "BYLADEM1ING")]),
    dict(file="druckerei-schmid-herbstprogramm.pdf", kind="invoice", vendor="Druckerei Schmid", tagline="Offset- und Digitaldruck",
         vendor_lines=["Hauptplatz 21", "85276 Pfaffenhofen a. d. Ilm", "USt-IdNr. DE812345678"], number="RE 4471", date="20.09.2026",
         title="Sammelrechnung Herbstprogramm", total=690.00,
         sections=[("Der kleine Lord", [(40, "St.", "Plakat A1, 4/0-farbig, 170 g matt", 6.50, A)]),
                   ("Das Hässliche Entlein", [(50, "St.", "Plakat A2, 4/0-farbig, 170 g matt", 4.60, A)]),
                   ("Workshop-Programm", [(1, "Aufl.", "Flyer DIN lang, 2.000 Stück, 4/4-farbig", 200.00, A)])],
         note=["Bitte mit Verwendungszweck „RE 4471“ und der Produktion überweisen.",
               "Zahlbar innerhalb von 14 Tagen ohne Abzug."],
         footer=["Druckerei Schmid · Hauptplatz 21 · 85276 Pfaffenhofen a. d. Ilm",
                 BANK_FOOTER.format("DE90 7215 1650 0000 1357 91", "BYLADEM1PAF")]),
    dict(file="omnibus-gruber-gastspiel.pdf", kind="invoice", vendor="Omnibus Gruber", tagline="Reisen und Gruppenfahrten",
         vendor_lines=["Scheyerer Straße 40", "85276 Pfaffenhofen a. d. Ilm", "USt-IdNr. DE816420864"], number="OG-2026-0922",
         date="22.09.2026", meta=[("Fahrt", "03.–04.10.2026")], title="Reisebus Gastspiel Nürnberg", total=1480.00,
         sections=[("Ensemble „Der kleine Lord“", [(1, "", "Reisebus 49 Sitze, Hin- und Rückfahrt, Fahrer", 700.00, B)]),
                   ("Ensemble „König der Löwen“", [(1, "", "Kleinbus 19 Sitze, Hin- und Rückfahrt", 500.00, B)]),
                   ("Kindertheater-Workshop", [(1, "", "Kleinbus 8 Sitze, Hin- und Rückfahrt", 280.00, B)])],
         note=["Anzahlung 600,00 € bis 23.09.2026, Restzahlung 880,00 € nach der Fahrt.",
               "Verwendungszweck: Busreise Gastspiel Nürnberg."],
         footer=["Omnibus Gruber · Scheyerer Straße 40 · 85276 Pfaffenhofen a. d. Ilm",
                 BANK_FOOTER.format("DE12 7215 1650 0000 8080 80", "BYLADEM1PAF")]),
    dict(file="theaterbedarf-weber-spielzeit.pdf", kind="invoice", vendor="Theaterbedarf Weber",
         tagline="Kostüm, Maske und Bühnenbedarf", vendor_lines=["Lindwurmstraße 140", "80337 München", "USt-IdNr. DE817531975"],
         number="RE 2026-0931", date="24.09.2026", title="Kostüm- und Maskenbedarf Spielzeit 2026/27", total=1340.00,
         sections=[("Das Hässliche Entlein", [(6, "St.", "Kostüm Ente, Plüsch mit Schnabelmaske", 90.00, A)]),
                   ("König der Löwen", [(4, "St.", "Kostüm Löwe mit Mähne", 120.00, A)]),
                   ("Workshops", [(8, "Set", "Kinderschminke Profi-Set", 25.00, A)]),
                   ("Kiosk", [(10, "Pk.", "Einweghandschuhe 100 St.", 7.50, A), (10, "Pk.", "Servietten 3-lagig 250 St.", 4.50, A)])],
         note=["Zahlung in Abschlägen: 1. Abschlag 700,00 €, 2. Abschlag 440,00 €, Restzahlung 200,00 €.",
               "Verwendungszweck: RE 2026-0931."],
         footer=["Theaterbedarf Weber · Lindwurmstraße 140 · 80337 München",
                 BANK_FOOTER.format("DE44 7016 0000 0000 2121 21", "GENODEF1M01")]),
]


def build(spec):
    path = OUT / spec["file"]
    if spec["kind"] == "bon":
        width, height = 80 * mm, bon_height(spec)
        c = Canvas(str(path), pagesize=(width, height), invariant=1)
        if spec.get("scanned"):
            # A crooked, greyish scan of a thermal receipt.
            c.setFillColor(HexColor("#e9e6df"))
            c.rect(0, 0, width, height, stroke=0, fill=1)
            c.translate(width / 2, height / 2)
            c.rotate(1.6)
            c.translate(-width / 2, -height / 2)
        bon(c, spec, width, height)
    else:
        c = Canvas(str(path), pagesize=A4, invariant=1)
        (invoice if spec["kind"] == "invoice" else letter)(c, spec)
    c.setTitle(spec["file"])
    c.setAuthor(spec["vendor"])
    c.showPage()
    c.save()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in RECEIPTS:
        build(spec)
        print(f"{spec['file']:40} {money(d(spec['total'])):>12}")


if __name__ == "__main__":
    main()
