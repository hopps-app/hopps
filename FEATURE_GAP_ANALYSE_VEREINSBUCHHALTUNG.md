# Feature-Gap-Analyse: Weg zur umfassenden Vereinsbuchhaltung

> Ziel: Hopps von einem Beleg-/Banking-Tool zu einer vollständigen Buchhaltungssoftware für gemeinnützige Vereine ausbauen — vergleichbar mit Lexoffice/DATEV, aber vereinsspezifisch.
>
> Stand der Analyse: 2026-07-20 · Basis: Codebase-Inventur des `app.hopps.org`-Service und der SPA.

## Wo Hopps heute steht

Hopps ist aktuell im Kern ein **Beleg- und Banking-Tool mit KI-Extraktion**, noch keine Buchhaltung im engeren Sinn.

**Bereits vorhanden (Stärken):**
- Belegerfassung (Belege/Documents) mit ZUGFeRD-Auslesung + Azure Document AI (OCR), Dedupe per Datei-Hash, Review-/Confirm-Workflow
- Bank-Import: CSV mit konfigurierbarem Schema-Editor (Delimiter, Encoding, Datums-/Zahlenformat, Soll/Haben) + MT940
- Bank-Abgleich/Matching (`BankTransactionMatch`, inkl. Teilbeträge/Splits) — UI-Drawer vorhanden
- Kostenstellen über den hierarchischen **Bommel-Baum** (Abteilungen/Projekte)
- **Sphärenrechnung** bereits angelegt: `TransactionArea` = ideeller Bereich / Zweckbetrieb / Vermögensverwaltung / wirtschaftlicher Geschäftsbetrieb
- Statistik/Aggregation je Organisation und je Bommel (Einnahmen/Ausgaben/Saldo, rekursiv)

**Fehlt fundamental:**
Ein echtes Buchungsmodell. Transaktionen sind Einzelsätze, deren Richtung nur am Vorzeichen des Betrags hängt — **kein Kontenrahmen, keine Buchungssätze, kein Journal, keine buchhalterischen Auswertungen, kein Steuer-/Meldewesen, keine Mitglieder-/Beitragsverwaltung, keine ausgehende Rechnung, keine Exporte.**

---

## Block 1 — Buchhaltungs-Kern (Fundament)

| Feature | Status heute | Was fehlt |
|---|---|---|
| **Kontenrahmen** | `Category` = freie Labels | **SKR49** (der Vereins-Kontenrahmen!), alternativ SKR03/04; Konten mit Nummer, Typ, Sphären-Zuordnung |
| **Buchungsmodell** | Einzelsätze, Vorzeichen | Wahlweise **EÜR (Ist/Cash-Basis)** für kleine Vereine **und** doppelte Buchführung (Soll/Haben-Buchungssätze) für bilanzierende |
| **Journal / Grund- & Hauptbuch** | – | Buchungsjournal, lückenlose Belegnummernkreise |
| **Geschäftsjahr & Abschluss** | – | Wirtschaftsjahr-Entität, Saldenvorträge/Eröffnungsbilanz, Periodenabschluss, Jahresabschluss |
| **GoBD-Konformität** | Teil-Audit (uploadedBy/reviewedBy) | **Festschreibung** (keine Änderung gebuchter Sätze), Storno statt Löschen, Änderungshistorie, Verfahrensdokumentation, GoBD-Datenexport (Z3) für Betriebsprüfung |

> **Empfehlung:** Die meisten kleinen Vereine machen **EÜR**. Damit als MVP starten, SKR49 als Kontenrahmen, doppelte Buchführung als Ausbaustufe.

## Block 2 — Vereins-Spezifika 🎯 (Alleinstellungsmerkmal ggü. Lexoffice)

| Feature | Status | Was fehlt |
|---|---|---|
| **Spendenverwaltung & Zuwendungsbestätigungen** | – | Spenden erfassen, **amtliche Spendenbescheinigungen** (Einzel- & Sammelbestätigung) nach offiziellem Muster, Zuwendungsempfänger-Register, Sachspenden |
| **Mitglieder- & Beitragsverwaltung** | `Member` = nur Keycloak-User, keine Rollen | Echte Mitgliederstammdaten (Beitritt/Austritt, Mitgliedsart), **Beitragsstaffeln**, Sollstellung, offene Beiträge |
| **SEPA** | – | **SEPA-Lastschrift (pain.008)** für Beitragseinzug inkl. Mandatsverwaltung, Gläubiger-ID, Pre-Notification; SEPA-Überweisung (pain.001) |
| **Gemeinnützigkeit** | Sphären vorhanden ✅ | **Mittelverwendungsrechnung**, zeitnahe Mittelverwendung, **Rücklagenverwaltung §62 AO** (freie/zweckgebundene), Freigrenze wirtschaftl. Geschäftsbetrieb (45.000 €) überwachen |
| **Fördermittel** | Ansatz via Bommel | **Fördermittel-/Zuschussverwaltung** mit Mittelbindung und **Verwendungsnachweis**-Reports (DSEE, Aktion Mensch, Kommunen …) |
| **Kassenprüfer-Rolle** | – | Revisoren-/Kassenprüfer-Zugang, Kassenprüfungsbericht für die Mitgliederversammlung |

## Block 3 — Rechnungsstellung (ausgehend)

- **Rechnungserstellung** mit Nummernkreis, Vorlagen — heute nur `InvoicesView`, das bestehende Daten rendert; keine echte Ausgangsrechnung.
- **E-Rechnung (ZUGFeRD/XRechnung) ausgehend** — Pflicht im B2B seit 2025 (Empfang) bzw. 2027/28 (Versand). ZUGFeRD kann aktuell nur gelesen, nicht geschrieben werden.
- Angebote, Gutschriften, **wiederkehrende Rechnungen**.
- **Mahnwesen** — `dueDate`/`amountDue` sind vorhanden, aber keine Mahnstufen, Mahngebühren, Verzugszinsen.

## Block 4 — Steuer & Meldewesen

- **Umsatzsteuer richtig**: Steuersätze/-schlüssel (0/7/19 %), Vorsteuer, **USt-Voranmeldung via ELSTER**, Kleinunternehmerregelung §19, USt-ID-Prüfung (VIES). Heute nur ein `totalTax`-Betrag.
- **Körperschaft-/Gewerbesteuer** für wirtschaftlichen Geschäftsbetrieb über Freigrenze.
- **ELSTER-Schnittstelle** allgemein (Anlage EÜR, USt).

## Block 5 — Auswertungen & Exporte

- **EÜR (Anlage EÜR)**, **BWA**, bei Bilanzierung **GuV + Bilanz**, **SuSa** (Summen-/Saldenliste).
- **Kassenbericht / Vermögensübersicht** für die Mitgliederversammlung, **Haushaltsplan (Budget) vs. Ist**.
- **Sphären-Auswertung** (Daten schon vorhanden — nur die Reports fehlen!).
- **DATEV-Export** (EXTF/DATEV-Format) für den Steuerberater; PDF/Excel-Exporte. Heute keinerlei Export-Endpunkte.

## Block 6 — Banking & Kasse

- **Bar-Kassenbuch** — für Vereine essenziell (Feste, Eintritt, Standgeld); heute nur Bankkonten.
- **FinTS/HBCI oder EBICS** für automatischen Kontoabruf statt CSV-Upload; Multibanking.
- Auto-Matching real ausbauen (`AUTO_RULE`/`AUTO_AI` sind laut Code noch „Phase 2"-Gerüst).

## Block 7 — Plattform / Querschnitt

- **Rollen & Rechte**: `Member` hat **kein Rollenfeld** — Vorstand, Kassenwart, Kassenprüfer, Buchhalter, Mitglied; 4-Augen-Freigabe.
- **Steuerberater-Zugang / Mandantenfähigkeit** (DATEV Unternehmen online-Style).
- **Anlagenbuchhaltung / AfA** (Abschreibungen, Inventar).
- Wiederkehrende Buchungen/Daueraufträge, Fremdwährungsumrechnung (`currencyCode` da, keine Umrechnung).

---

## Empfohlene Reihenfolge (Roadmap)

1. **Fundament zuerst:** Kontenrahmen (SKR49) + EÜR-Buchungslogik + Geschäftsjahr + GoBD-Festschreibung. Ohne das bleibt alles darüber Stückwerk.
2. **Vereins-Differenzierer:** Spendenbescheinigungen + Mitglieder-/Beitragsverwaltung + SEPA-Lastschrift. Das ist der Grund, warum ein Verein *euch* statt Lexoffice nimmt.
3. **Auswertungen & DATEV-Export** (nutzt Sphären-Daten, die schon da sind) — schneller Mehrwert für Steuerberater.
4. **Ausgangsrechnung + E-Rechnung + Mahnwesen.**
5. **USt/ELSTER, Kassenbuch, FinTS, Fördermittelnachweise, Anlagenbuchhaltung** als Reifegrad-Ausbau.

### Quick Wins (setzen auf Vorhandenem auf)
- **Sphären-Auswertungen** — Daten existieren (`TransactionArea`), nur das Reporting fehlt.
- **DATEV-Export** der bestehenden Transaktionen.
