#!/usr/bin/env python3
"""Erzeugt zwei E-Rechnungen (ZUGFeRD 2 / Factur-X, Profil EN 16931) als Demo-Belege.

Anders als die übrigen Demo-Belege tragen diese PDFs die Rechnung zusätzlich als XML in sich
(eingebettete Datei ``factur-x.xml``, PDF/A-3). Hopps liest solche Belege ohne KI direkt über den
zugferd-Service aus; der Beleg bekommt die Extraktionsquelle ZUGFERD.

    pip install reportlab factur-x
    python demo-data/e-rechnungen/build_erechnungen.py

Die PDFs landen in demo-data/e-rechnungen/belege. Der sichtbare Teil ist reproduzierbar; die
Factur-X-Bibliothek schreibt allerdings das Erzeugungsdatum in die PDF-Metadaten, deshalb ändern
sich die Dateien bei jedem Lauf ein wenig.
"""
from decimal import ROUND_HALF_UP, Decimal
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from facturx import generate_from_binary
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen.canvas import Canvas

OUT = Path(__file__).resolve().parent / "belege"

ACCENT = HexColor("#7E3FB4")
INK = HexColor("#1f2328")
MUTED = HexColor("#57606a")
FAINT = HexColor("#8b949e")
RULE = HexColor("#d0d7de")
SOFT = HexColor("#f6f0fb")

CENT = Decimal("0.01")

# Empfänger: der Verein der Standard-Demodaten.
BUYER = dict(
    name="Theatervereine Bühnefrei e.V.",
    street="Dechant-Karthaus-Straße 172",
    postcode="33397",
    city="Rietberg",
)


def d(value) -> Decimal:
    return Decimal(str(value)).quantize(CENT)


def money(value: Decimal) -> str:
    s = f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{s} €"


def ymd(date: str) -> str:
    """'24.09.2026' -> '20260924' (Format 102 der Factur-X-XML)."""
    day, month, year = date.split(".")
    return f"{year}{month}{day}"


def line_total(item) -> Decimal:
    qty, _unit, _text, price = item
    return (Decimal(str(qty)) * Decimal(str(price))).quantize(CENT, ROUND_HALF_UP)


def totals(spec):
    net = sum((line_total(i) for i in spec["items"]), Decimal(0))
    tax = (net * Decimal(spec["vat_rate"]) / 100).quantize(CENT, ROUND_HALF_UP)
    gross = net + tax
    if gross != d(spec["total"]):
        raise SystemExit(f"{spec['file']}: Positionen ergeben {gross} brutto, Beleg sagt {spec['total']}")
    return net, tax, gross


# ─── Sichtbare Rechnung (A4) ───────────────────────────────────────────────────────────────────────────────────────


def draw_invoice(c: Canvas, spec):
    net, tax, gross = totals(spec)
    w, h = A4
    left, right = 20 * mm, w - 20 * mm
    seller = spec["seller"]

    # Briefkopf
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(left, h - 28 * mm, seller["name"])
    c.setFillColor(MUTED)
    c.setFont("Helvetica", 9)
    c.drawString(left, h - 33 * mm, spec["tagline"])
    for i, line in enumerate(seller["lines"]):
        c.drawRightString(right, h - 24 * mm - i * 4.2 * mm, line)
    c.setStrokeColor(ACCENT)
    c.setLineWidth(2)
    c.line(left, h - 37 * mm, right, h - 37 * mm)

    # Empfänger und Rechnungsdaten
    y = h - 50 * mm
    c.setFont("Helvetica", 7)
    c.setFillColor(FAINT)
    c.drawString(left, y + 6 * mm, f"{seller['name']} · {seller['street']} · {seller['postcode']} {seller['city']}")
    c.setFillColor(INK)
    c.setFont("Helvetica", 10.5)
    for i, line in enumerate([BUYER["name"], BUYER["street"], f"{BUYER['postcode']} {BUYER['city']}"]):
        c.drawString(left, y - i * 5 * mm, line)
    meta = [("Rechnungs-Nr.", spec["number"]), ("Rechnungsdatum", spec["date"]),
            ("Leistungsdatum", spec["delivery_date"]), ("Fällig am", spec["due_date"])]
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
    y -= 7 * mm
    c.setFont("Helvetica", 9.5)
    c.setFillColor(MUTED)
    c.drawString(left, y, spec["intro"])

    # Positionen
    y -= 12 * mm
    col_qty, col_price, col_total = left + 18 * mm, right - 32 * mm, right
    c.setFillColor(SOFT)
    c.rect(left, y - 2 * mm, right - left, 7 * mm, stroke=0, fill=1)
    c.setFillColor(MUTED)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(left + 2 * mm, y, "Menge")
    c.drawString(col_qty + 4 * mm, y, "Bezeichnung")
    c.drawRightString(col_price, y, "Einzelpreis")
    c.drawRightString(col_total, y, "Betrag (netto)")
    y -= 8 * mm
    c.setFont("Helvetica", 9.5)
    for qty, unit, text, price in spec["items"]:
        c.setFillColor(INK)
        c.drawString(left + 2 * mm, y, f"{qty} {unit}")
        c.drawString(col_qty + 4 * mm, y, text)
        c.drawRightString(col_price, y, money(d(price)))
        c.drawRightString(col_total, y, money(line_total((qty, unit, text, price))))
        c.setStrokeColor(RULE)
        c.setLineWidth(0.4)
        c.line(left, y - 2.5 * mm, right, y - 2.5 * mm)
        y -= 7 * mm

    # Summen
    y -= 4 * mm
    rows = [("Nettobetrag", money(net)), (f"zzgl. {spec['vat_rate']} % USt.", money(tax))]
    for label, value in rows:
        c.setFillColor(MUTED)
        c.setFont("Helvetica", 9.5)
        c.drawRightString(col_price, y, label)
        c.setFillColor(INK)
        c.drawRightString(col_total, y, value)
        y -= 6 * mm
    y -= 2 * mm
    c.setFillColor(SOFT)
    c.rect(col_price - 45 * mm, y - 2.5 * mm, right - col_price + 45 * mm, 7.5 * mm, stroke=0, fill=1)
    c.setFillColor(ACCENT)
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(col_price, y, "Rechnungsbetrag")
    c.drawRightString(col_total, y, money(gross))

    # Zahlungshinweis
    y -= 18 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica", 9.5)
    for line in [
        f"Bitte überweisen Sie den Betrag bis zum {spec['due_date']} unter Angabe der Rechnungsnummer auf:",
        f"{seller['bank']} · IBAN {seller['iban']} · BIC {seller['bic']}",
    ]:
        c.drawString(left, y, line)
        y -= 5.5 * mm
    for line in spec.get("note", []):
        c.setFillColor(MUTED)
        c.drawString(left, y, line)
        y -= 5.5 * mm

    # Fußzeile
    c.setFillColor(FAINT)
    c.setFont("Helvetica", 7.5)
    footer = [
        f"{seller['name']} · {seller['street']} · {seller['postcode']} {seller['city']}",
        f"Steuernummer {seller['tax_number']} · USt-IdNr. {seller['vat_id']}",
        "Diese Rechnung enthält die Rechnungsdaten zusätzlich als XML (ZUGFeRD 2 / Factur-X, Profil EN 16931).",
    ]
    for i, line in enumerate(footer):
        c.drawCentredString(w / 2, 18 * mm - i * 3.6 * mm, line)


# ─── Factur-X XML (CII, Profil EN 16931) ───────────────────────────────────────────────────────────────────────────


def line_xml(index: int, item, vat_rate) -> str:
    qty, unit, text, price = item
    unit_code = {"Stk.": "C62", "Std.": "HUR", "Tag": "DAY", "Tage": "DAY", "Pausch.": "C62"}.get(unit, "C62")
    return f"""
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>{index}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>{escape(text)}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>{d(price)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="{unit_code}">{qty}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>{vat_rate}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>{line_total(item)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>"""


def facturx_xml(spec) -> bytes:
    net, tax, gross = totals(spec)
    seller = spec["seller"]
    lines = "".join(line_xml(i + 1, item, spec["vat_rate"]) for i, item in enumerate(spec["items"]))
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
    xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
    xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
    xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>{escape(spec["number"])}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">{ymd(spec["date"])}</udt:DateTimeString>
    </ram:IssueDateTime>
    <ram:IncludedNote>
      <ram:Content>{escape(spec["title"])}</ram:Content>
    </ram:IncludedNote>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>{lines}
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>{escape(spec["buyer_reference"])}</ram:BuyerReference>
      <ram:SellerTradeParty>
        <ram:Name>{escape(seller["name"])}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>{seller["postcode"]}</ram:PostcodeCode>
          <ram:LineOne>{escape(seller["street"])}</ram:LineOne>
          <ram:CityName>{escape(seller["city"])}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="FC">{seller["tax_number"]}</ram:ID>
        </ram:SpecifiedTaxRegistration>
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">{seller["vat_id"]}</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>{escape(BUYER["name"])}</ram:Name>
        <ram:PostalTradeAddress>
          <ram:PostcodeCode>{BUYER["postcode"]}</ram:PostcodeCode>
          <ram:LineOne>{escape(BUYER["street"])}</ram:LineOne>
          <ram:CityName>{escape(BUYER["city"])}</ram:CityName>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">{ymd(spec["delivery_date"])}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>{escape(spec["number"])}</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans>
        <ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount>
          <ram:IBANID>{seller["iban"].replace(" ", "")}</ram:IBANID>
        </ram:PayeePartyCreditorFinancialAccount>
        <ram:PayeeSpecifiedCreditorFinancialInstitution>
          <ram:BICID>{seller["bic"]}</ram:BICID>
        </ram:PayeeSpecifiedCreditorFinancialInstitution>
      </ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>{tax}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>{net}</ram:BasisAmount>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>{spec["vat_rate"]}</ram:RateApplicablePercent>
      </ram:ApplicableTradeTax>
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>Zahlbar bis {spec["due_date"]} ohne Abzug.</ram:Description>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">{ymd(spec["due_date"])}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>{net}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>{net}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">{tax}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>{gross}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>{gross}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
"""
    return xml.encode("utf-8")


# ─── Belege ────────────────────────────────────────────────────────────────────────────────────────────────────────

# Positionen: (Menge, Einheit, Bezeichnung, Einzelpreis netto). Alle Beträge, Firmen, IBANs und Steuernummern
# sind frei erfunden.
INVOICES = [
    dict(
        file="erechnung-lichtwerk-premiere.pdf",
        seller=dict(
            name="Lichtwerk Veranstaltungstechnik GmbH",
            lines=["Industriestraße 14", "85053 Ingolstadt", "rechnung@lichtwerk-vt.example"],
            street="Industriestraße 14", postcode="85053", city="Ingolstadt",
            tax_number="124/120/30815", vat_id="DE314159265",
            bank="Sparkasse Ingolstadt Eichstätt", iban="DE91 7215 0000 0012 3456 78", bic="BYLADEM1ING",
        ),
        tagline="Licht · Ton · Bühne für Theater und Veranstaltungen",
        number="LW-2026-0472",
        date="24.09.2026",
        delivery_date="20.09.2026",
        due_date="08.10.2026",
        buyer_reference="Premiere Herbstspielzeit",
        title="Rechnung Lichttechnik Premiere",
        intro="Mietgeräte für die Premiere am 19.09.2026, Lieferung 18.09., Abholung 20.09.2026.",
        items=[
            (2, "Stk.", "LED-Profilscheinwerfer 150 W, Miete 3 Tage", 95.00),
            (1, "Stk.", "Lichtstellpult 24 Kanal, Miete 3 Tage", 180.00),
            (1, "Stk.", "Dimmerpack 12 Kanal inkl. Verkabelung, Miete 3 Tage", 120.00),
            (1, "Pausch.", "Lieferung und Abholung Ingolstadt - Rietberg", 60.00),
        ],
        vat_rate=19,
        total=654.50,
        note=["Vielen Dank für den Auftrag. Wir wünschen eine erfolgreiche Spielzeit."],
    ),
    dict(
        file="erechnung-druckhaus-programmhefte.pdf",
        seller=dict(
            name="Druckhaus Mayr e.K.",
            lines=["Am Mühlbach 3", "85276 Pfaffenhofen an der Ilm", "info@druckhaus-mayr.example"],
            street="Am Mühlbach 3", postcode="85276", city="Pfaffenhofen an der Ilm",
            tax_number="125/228/41077", vat_id="DE271828182",
            bank="VR Bank Bayern Mitte", iban="DE44 7216 0818 0004 7110 23", bic="GENODEF1INP",
        ),
        tagline="Druckerei und Verlag seit 1952",
        number="2026-1187",
        date="02.10.2026",
        delivery_date="30.09.2026",
        due_date="16.10.2026",
        buyer_reference="Programmhefte Herbstspielzeit 2026",
        title="Rechnung Programmhefte",
        intro="Programmhefte zur Herbstspielzeit 2026, geliefert am 30.09.2026.",
        items=[
            (300, "Stk.", "Programmheft A5, 16 Seiten, 4/4-farbig, Rückstichheftung", 1.20),
            (1, "Pausch.", "Druckvorstufe und Satz", 40.00),
        ],
        vat_rate=7,
        total=428.00,
        note=["Druckerzeugnisse unterliegen dem ermäßigten Steuersatz von 7 %."],
    ),
]


def build(spec) -> Path:
    buffer = BytesIO()
    c = Canvas(buffer, pagesize=A4, invariant=1)
    draw_invoice(c, spec)
    c.setTitle(spec["number"])
    c.setAuthor(spec["seller"]["name"])
    c.showPage()
    c.save()

    pdf = generate_from_binary(
        buffer.getvalue(),
        facturx_xml(spec),
        flavor="factur-x",
        level="en16931",
        check_xsd=True,
        pdf_metadata=dict(
            author=spec["seller"]["name"],
            title=f"{spec['title']} {spec['number']}",
            subject=f"Rechnung {spec['number']} an {BUYER['name']}",
            keywords="Rechnung, Factur-X, ZUGFeRD, Demo",
        ),
        lang="de-DE",
    )
    path = OUT / spec["file"]
    path.write_bytes(pdf)
    return path


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for spec in INVOICES:
        build(spec)
        print(f"{spec['file']:44} {money(d(spec['total'])):>12}")


if __name__ == "__main__":
    main()
