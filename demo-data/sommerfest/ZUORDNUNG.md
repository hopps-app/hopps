# Zuordnungs-Anleitung – Sommerfest-Demodaten

Diese Anleitung beschreibt, **welcher Beleg zu welcher Bankbuchung gehört** und wie der Abgleich
in hopps aussehen soll. Gedacht zum Weitergeben an Kolleg:innen, die die Demo nachstellen.

Kontext: Sommerfest von **Theatervereine Bühnefrei e.V.**, Konto „Testkonto Bühnefrei"
(IBAN `DE02 1203 0000 0000 2020 51`), Juli 2026.

---

## Ablauf in der Demo

1. **Belege hochladen** – die 6 PDFs aus `belege/` unter *Belege* importieren. Die Beleg-Erkennung
   liest Betrag, Datum und Aussteller aus.
2. **Bankdatei importieren** – `sommerfest-bankdaten.csv` unter *Bankkonten → Import* hochladen.
   Format (Sparkasse CAMT.052 v8) wird automatisch erkannt. Es erscheinen **7 Buchungen**.
3. **Zuordnen** – jede Buchung über **„Zuordnen"** mit dem/den passenden Beleg(en) verknüpfen
   (siehe Tabelle unten). Bei Teilbeträgen (Fall 2 & 3) den „verwendeten Betrag" je Verknüpfung setzen.
4. **Ergebnis** – 5 Buchungen sind vollständig zugeordnet, 2 bleiben bewusst offen (Rauschen).

---

## Zuordnungstabelle (Beleg ↔ Bankbuchung)

| Fall | Bankbuchung (Datum · Zweck) | Betrag | Beleg(e) | Beleg-Betrag | Verwendeter Betrag | Erwarteter Status |
|------|------------------------------|--------|----------|--------------|--------------------|-------------------|
| **1** | 03.07.26 · Rechnung Getränke Sommerfest | −287,40 € | `beleg-A-getraenke-huber.pdf` | 287,40 € | 287,40 € | ✅ Vollständig |
| **2a** | 20.06.26 · Anzahlung Festzelt F-2026-118 | −350,00 € | `beleg-B-festzelt-bayer.pdf` | 1.150,00 € | 350,00 € | ◑ Teilweise |
| **2b** | 10.07.26 · Restzahlung Festzelt F-2026-118 | −800,00 € | `beleg-B-festzelt-bayer.pdf` | 1.150,00 € | 800,00 € | ✅ Beleg danach voll gedeckt |
| **3** | 15.07.26 · Auslagenerstattung Sommerfest | −163,90 € | `beleg-C1-bioladen-gruenkern.pdf` | 78,60 € | 78,60 € | ✅ Vollständig |
| | ↳ (dieselbe Buchung) | | `beleg-C2-baeckerei-koernerhof.pdf` | 46,30 € | 46,30 € | (Teilbetrag) |
| | ↳ (dieselbe Buchung) | | `beleg-C3-mehrweg-geschirrmobil.pdf` | 39,00 € | 39,00 € | (Teilbetrag) |
| **4** | 08.07.26 · Spende Sommerfest | +250,00 € | `beleg-D-spendenquittung.pdf` | 250,00 € | 250,00 € | ✅ Vollständig |
| — | 14.07.26 · Bareinzahlung Getränkeeinnahmen | +540,00 € | *(kein Beleg – Rauschen)* | — | — | ⚪ Bleibt offen |
| — | 02.07.26 · Entgeltabschluss / Kontoführung | −4,90 € | *(kein Beleg – Rauschen)* | — | — | ⚪ Bleibt offen |

**Kontrollsummen:**
- Fall 2: 350,00 € + 800,00 € = **1.150,00 €** (= Beleg B)
- Fall 3: 78,60 € + 46,30 € + 39,00 € = **163,90 €** (= Bankbuchung)

---

## Was jeder Fall demonstriert

- **Fall 1 – Direkte 1:1-Zuordnung:** Betrag der Buchung stimmt exakt mit dem Beleg überein.
  Der einfachste (und häufigste) Fall.
- **Fall 2 – Ein Beleg, mehrere Buchungen:** Eine Rechnung wurde in Anzahlung + Restzahlung bezahlt.
  Zeigt, dass sich mehrere Buchungen zu **einem** Beleg summieren.
- **Fall 3 – Eine Buchung, mehrere Belege:** Ein Vorstandsmitglied hat drei Einkäufe ausgelegt und
  per **einer** Sammel-Erstattung zurückbekommen. Zeigt die Aufteilung einer Buchung auf **mehrere** Belege.
- **Fall 4 – Einnahme mit Spendenquittung:** Positive Buchung (Geldeingang) wird der ausgestellten
  Zuwendungsbestätigung zugeordnet – der Abgleich auf der Einnahmenseite.
- **Rauschen (2 Buchungen):** Bleiben absichtlich offen. In der Praxis ist nie alles glatt zuzuordnen –
  so sieht man, dass hopps offene Posten sichtbar macht.

---

## Nachhaltigkeit
Verpflegung durchgehend **vegetarisch/vegan**, **Mehrweggeschirr** statt Einweg (eigener Beleg C3).

> Alle Beträge, Namen, IBANs und Steuernummern sind frei erfunden (reine Demodaten).
