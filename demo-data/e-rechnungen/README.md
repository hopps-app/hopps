# Demodaten: E-Rechnungen (ZUGFeRD / Factur-X)

Zwei Rechnungen an **Theatervereine Bühnefrei e.V.** (der Verein der Standard-Demodaten), die neben dem
sichtbaren PDF auch die Rechnungsdaten als XML in sich tragen: **ZUGFeRD 2 / Factur-X, Profil EN 16931**
(eingebettete Datei `factur-x.xml`, PDF/A-3).

Hopps erkennt solche Belege beim Hochladen und liest sie **ohne KI** über den `zugferd`-Service aus.
Betrag, Datum, Rechnungsnummer, Aussteller mit Adresse und Steuernummern, Fälligkeit, Netto und
Umsatzsteuer kommen direkt aus dem XML; der Beleg bekommt die Extraktionsquelle **ZUGFERD** statt AI.
Alle übrigen Demo-Belege (Sommerfest, Testdaten) sind reine Bild-PDFs und laufen über die KI-Erkennung.

## Dateien

| Datei | Inhalt | Betrag |
|-------|--------|--------|
| `belege/erechnung-lichtwerk-premiere.pdf` | Lichtwerk Veranstaltungstechnik GmbH, Rechnung LW-2026-0472 vom 24.09.2026: Mietgeräte Lichttechnik für die Premiere, 19 % USt. | 654,50 € (netto 550,00 €) |
| `belege/erechnung-druckhaus-programmhefte.pdf` | Druckhaus Mayr e.K., Rechnung 2026-1187 vom 02.10.2026: 300 Programmhefte zur Herbstspielzeit, 7 % USt. | 428,00 € (netto 400,00 €) |
| `build_erechnungen.py` | Generator (sichtbare Rechnung mit reportlab, XML nach EN 16931, Einbettung mit `factur-x`) |

## Ausprobieren

1. Der `zugferd`-Service muss laufen (lokal Port 8103, siehe `backend/app.hopps.zugferd`).
2. Die beiden PDFs unter *Belege* hochladen.
3. Im Log des org-Service erscheint `ZugFerd extraction successful`, der Beleg ist sofort mit allen
   Daten gefüllt und zeigt die Quelle ZUGFERD.

Direkt gegen den Service, ohne Hopps:

```bash
curl -F "document=@belege/erechnung-lichtwerk-premiere.pdf" -F "transactionRecordId=1" \
  http://localhost:8103/api/zugferd/document/scan
```

## Neu erzeugen / anpassen

```bash
pip install reportlab factur-x
python build_erechnungen.py
```

Positionen, Beträge und Steuersätze stehen in `INVOICES` im Skript. Das Skript prüft, dass die Positionen
plus Umsatzsteuer genau den Rechnungsbetrag ergeben, und validiert das XML gegen das Factur-X-Schema.
Die `factur-x`-Bibliothek schreibt das Erzeugungsdatum in die PDF-Metadaten, deshalb unterscheiden sich
die Dateien nach jedem Lauf, auch wenn sich inhaltlich nichts geändert hat.

> Alle Beträge, Firmen, Adressen, IBANs und Steuernummern sind frei erfunden (reine Demodaten).
