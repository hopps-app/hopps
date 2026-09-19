#!/usr/bin/env python3
"""Erzeugt die Sommerfest-Bankdatei im Sparkasse CAMT.052 v8 Format (windows-1252)."""

HEADER = [
    "Auftragskonto", "Buchungstag", "Valutadatum", "Buchungstext", "Verwendungszweck",
    "Glaeubiger ID", "Mandatsreferenz", "Kundenreferenz (End-to-End)", "Sammlerreferenz",
    "Lastschrift Ursprungsbetrag", "Auslagenersatz Ruecklastschrift",
    "Beguenstigter/Zahlungspflichtiger", "Kontonummer/IBAN", "BIC (SWIFT-Code)",
    "Betrag", "Waehrung", "Info",
]

KONTO = "DE02120300000000202051"

# (Buchungstag, Valuta, Buchungstext, Verwendungszweck, E2E, Beguenstigter, IBAN, BIC, Betrag)
ROWS = [
    # Fall 3 – eine Buchung deckt drei Belege (Auslagenerstattung)
    ("15.07.26", "15.07.26", "UEBERWEISUNG",
     "AUSLAGENERSTATTUNG SOMMERFEST// EINKAEUFE VERPFLEGUNG U. GESCHIRR",
     "NOTPROVIDED", "Miriam Buehnemann", "DE21500105171234567890", "INGDDEFFXXX", "-163,90"),
    # Rausch-/Einnahmezeile ohne Beleg – Bareinzahlung Getraenkeeinnahmen
    ("14.07.26", "14.07.26", "BARGELDEINZAHLUNG",
     "BAREINZAHLUNG GETRAENKEEINNAHMEN SOMMERFEST",
     "", "Theatervereine Buehnefrei e.V.", "DE02120300000000202051", "BYLADEM1001", "540,00"),
    # Fall 2 – Teil 2/2: Restzahlung Festzelt
    ("10.07.26", "10.07.26", "UEBERWEISUNG",
     "RESTZAHLUNG SOMMERFEST RG F-2026-118 FESTZELT BUEHNE GARNITUREN",
     "F-2026-118-R", "Festzeltverleih Bayer GmbH", "DE75700202700012345678", "HYVEDEMMXXX", "-800,00"),
    # Fall 4 – Einnahme mit passender Spendenquittung
    ("08.07.26", "08.07.26", "GUTSCHRIFT UEBERWEISUNG",
     "SPENDE SOMMERFEST HERZLICHEN DANK BITTE UM SPENDENQUITTUNG",
     "SPENDE-SOFE-2026-004", "Familie Sonnenschein", "DE68500105172987654321", "INGDDEFFXXX", "250,00"),
    # Fall 1 – 1:1 direkte Zuordnung, Betrag identisch zum Beleg
    ("03.07.26", "03.07.26", "UEBERWEISUNG",
     "RECHNUNG 2026-0713 GETRAENKE SOMMERFEST",
     "RG-2026-0713", "Getraenke Huber GmbH", "DE44700202700099887766", "HYVEDEMMXXX", "-287,40"),
    # Rauschzeile ohne Beleg – Kontofuehrungsentgelt
    ("02.07.26", "02.07.26", "ENTGELTABSCHLUSS",
     "ENTGELTABSCHLUSS SIEHE ANLAGE NR. 2/2026 KONTOFUEHRUNG",
     "", "", "", "", "-4,90"),
    # Fall 2 – Teil 1/2: Anzahlung Festzelt (frueheres Datum)
    ("20.06.26", "20.06.26", "UEBERWEISUNG",
     "ANZAHLUNG SOMMERFEST ANGEBOT F-2026-118 FESTZELT",
     "F-2026-118-A", "Festzeltverleih Bayer GmbH", "DE75700202700012345678", "HYVEDEMMXXX", "-350,00"),
]


def field(v):
    return '"' + v + '"'


def main():
    lines = [";".join(field(h) for h in HEADER)]
    for (bt, val, btext, vwz, e2e, beg, iban, bic, betrag) in ROWS:
        cols = [KONTO, bt, val, btext, vwz, "", "", e2e, "", "", "", beg, iban, bic, betrag, "EUR", "Umsatz gebucht"]
        lines.append(";".join(field(c) for c in cols))
    data = "\r\n".join(lines) + "\r\n"
    with open("sommerfest-bankdaten.csv", "w", encoding="cp1252", newline="") as f:
        f.write(data)
    print("sommerfest-bankdaten.csv geschrieben (%d Zeilen, windows-1252)" % (len(lines)))


if __name__ == "__main__":
    main()
