# Demodaten: Sommerfest – Bank-Import & Belegabgleich

Testdaten für Demozwecke rund um den **Bank-Import** und das **Beleg-Matching** in hopps.
Kontext: das jährliche **Sommerfest** des Vereins **Theatervereine Bühnefrei e.V.** (der Verein,
an dem auch die Standard-Demodaten / das Testkonto hängen, IBAN `DE02 1203 0000 0000 2020 51`).

Das Set deckt bewusst die vier typischen Abgleich-Situationen ab – von der glatten 1:1-Zuordnung
bis zu N:M-Fällen, plus eine Einnahme mit passender Spendenquittung.

## Dateien

| Datei | Zweck |
|-------|-------|
| `sommerfest-bankdaten.csv` | Kontoauszug zum Import – **Sparkasse CAMT.052 v8** (windows-1252, `;`-getrennt, Dezimalkomma, Datum `TT.MM.JJ`). Wird beim Import automatisch als Schema erkannt. |
| `belege/beleg-A-getraenke-huber.pdf` | Rechnung Getränke, 287,40 € |
| `belege/beleg-B-festzelt-bayer.pdf` | Rechnung Festzelt gesamt 1.150,00 € (Anzahlung 350 € + Rest 800 €) |
| `belege/beleg-C1-bioladen-gruenkern.pdf` | Kassenbon veganes Grillgut, 78,60 € |
| `belege/beleg-C2-baeckerei-koernerhof.pdf` | Kassenbon Kuchen & Brötchen, 46,30 € |
| `belege/beleg-C3-mehrweg-geschirrmobil.pdf` | Rechnung Mehrweggeschirr-Verleih, 39,00 € |
| `belege/beleg-D-spendenquittung.pdf` | Zuwendungsbestätigung an Familie Sonnenschein, 250,00 € |
| `ZUORDNUNG.md` | **Schritt-für-Schritt-Zuordnung** (Beleg ↔ Bankbuchung) – zum Weitergeben an Kolleg:innen |
| `build_csv.py`, `build_belege.py` | Generatoren (zum Anpassen/Neu­erzeugen) |

## Die vier Abgleich-Fälle

### Fall 1 · Direkte 1:1-Zuordnung (Betrag identisch)
Eine Banküberweisung, ein Beleg, exakt gleicher Betrag.

| Bankbuchung | Beleg | Betrag |
|---|---|---|
| 03.07.26 · Getränke Huber GmbH | `beleg-A-getraenke-huber.pdf` | −287,40 € |

→ Erwartet: **vollständig zugeordnet** (FULLY_MATCHED).

### Fall 2 · Ein Beleg, mehrere Bankbuchungen (Anzahlung + Restzahlung)
Der Festzelt-Beleg über 1.150,00 € wurde in zwei Raten bezahlt.

| Bankbuchung | Beleg | Betrag |
|---|---|---|
| 20.06.26 · Festzeltverleih Bayer (Anzahlung) | `beleg-B-festzelt-bayer.pdf` | −350,00 € |
| 10.07.26 · Festzeltverleih Bayer (Restzahlung) | `beleg-B-festzelt-bayer.pdf` | −800,00 € |

→ Erwartet: jede Buchung einzeln **teilweise**, beide zusammen decken den Beleg (350 + 800 = 1.150 €).

### Fall 3 · Eine Bankbuchung, mehrere Belege (Auslagenerstattung)
Vorstandsmitglied Miriam Bühnemann hat drei Einkäufe vorgestreckt und bekommt **eine** Sammel-Erstattung.
Beim Abgleich wird die eine Buchung per Teilbeträgen auf die drei Belege verteilt.

| Bankbuchung | Belege | Teilbeträge |
|---|---|---|
| 15.07.26 · Auslagenerstattung, −163,90 € | `beleg-C1` 78,60 € · `beleg-C2` 46,30 € · `beleg-C3` 39,00 € | 78,60 + 46,30 + 39,00 = **163,90 €** |

→ Erwartet: **vollständig zugeordnet**, sobald alle drei Belege verknüpft sind.

### Fall 4 · Einnahme mit Spendenquittung
Eine eingehende Spende (positiver Betrag) wird der ausgestellten Zuwendungsbestätigung zugeordnet.

| Bankbuchung | Beleg | Betrag |
|---|---|---|
| 08.07.26 · Spende Familie Sonnenschein | `beleg-D-spendenquittung.pdf` | +250,00 € |

→ Erwartet: **vollständig zugeordnet** (Einnahmen-Seite).

## Bewusst offene Buchungen (Rauschen)
Damit der Auszug realistisch wirkt, bleiben zwei Buchungen ohne Beleg und damit **unzugeordnet**:

| Bankbuchung | Betrag |
|---|---|
| 02.07.26 · Entgeltabschluss / Kontoführung | −4,90 € |
| 14.07.26 · Bareinzahlung Getränkeeinnahmen Sommerfest | +540,00 € |

## Nachhaltigkeits-Hinweis
Die Verpflegung ist durchgehend **vegetarisch/vegan** und es kommt **Mehrweggeschirr** statt Einweg zum
Einsatz – passend zum Anspruch, mit hopps auch nachhaltig vorzeigbar voranzugehen.

## Neu erzeugen / anpassen
```bash
python3 build_csv.py      # -> sommerfest-bankdaten.csv (windows-1252)
python3 build_belege.py   # -> belege/*.html
# HTML -> PDF (Chrome headless):
for f in belege/*.html; do
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --disable-gpu --no-pdf-header-footer --print-to-pdf="${f%.html}.pdf" "file://$PWD/$f"
done
```

> Alle Beträge, Vorgänge, Namen, IBANs und Steuernummern sind frei erfunden (Demozweck).
