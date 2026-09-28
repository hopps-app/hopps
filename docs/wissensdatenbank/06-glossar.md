# Glossar: Kundensprache → Hopps

_Stand: 2026-09-17_

Anforderungen verwenden selten Hopps-Begriffe. Vor dem Beantworten jeden Fachbegriff hier abbilden.
Neue Begriffe aus Anfragen **anonymisiert** ergänzen.

## Hopps-Kernbegriffe

| Hopps-Begriff | Bedeutung | Code |
|---|---|---|
| **Organisation** | Mandant (Verein/Verband) | `organization/` |
| **Bommel** | Knoten im hierarchischen Strukturbaum einer Organisation – kann Abteilung, Gruppe, Stufe, Projekt, Anlass oder Kostenstelle sein | `bommel/` |
| **Beleg** (Document) | Hochgeladene Rechnung/Quittung inkl. KI-Extraktion und Prüf-Status | `document/` |
| **Transaktion** | Finanzbewegung (Einnahme/Ausgabe), optional mit Beleg verknüpft | `transaction/` |
| **Kategorie** | Frei definierbare Einordnung von Transaktionen (heute kein Kontenrahmen) | `category/` |
| **Member** | Benutzerkonto (Keycloak), Mitglied einer oder mehrerer Organisationen | `member/` |
| **Bank-Import** | CSV/MT940-Kontoauszug, Abgleich mit Transaktionen | `bankimport/` |
| **Sphäre** (TransactionArea) | Steuerliche Tätigkeitsbereiche gemeinnütziger Vereine (DE) | `transaction/` |

## Kundenbegriffe → Hopps

| Kundenbegriff (Varianten) | Region | Hopps-Entsprechung / Hinweis |
|---|---|---|
| Anlass, Lager, Event, Veranstaltung, Freizeit, Fahrt, Projekt | CH / DE | **Bommel** (Unterknoten, z. B. unter einer Abteilung) |
| Abteilung, Sparte, Stufe, Gruppe, Ortsgruppe, Sektion, Kantonalverband | CH / DE | **Bommel** (Ebenen im Baum) |
| Kassier, Kassierin, Kassenwart:in, Schatzmeister:in, Finanzverantwortliche:r | CH / DE | Benutzer mit Finanzverantwortung – ⚠ heute **kein eigenes Rollenmodell**, siehe `02` → Benutzer & Rechte |
| Anlass-Kassier, Lagerkassier | CH | Kassier auf Ebene eines einzelnen Bommels – ⚠ Rechte pro Bommel prüfen (`02`) |
| Quittung, Kassenzettel, Rechnung, Beleg, Kassabon | CH / DE / AT | **Beleg** (Document) |
| Spesen, Auslagen, Auslagenerstattung, Rückerstattung, Auszahlung | CH / DE | Erstattung privat vorgestreckter Beträge – ⚠ siehe `02` → Auslagen |
| Auszahlungskonto, IBAN, Bankverbindung | CH / DE | Bankverbindung der erstattungsberechtigten Person – siehe `02` |
| Budget, Haushaltsplan, Voranschlag | CH / DE | siehe `02` → Budget |
| Freigabe, Bewilligung, Genehmigung, 4-Augen-Prinzip, Visum | CH / DE | siehe `02` → Freigabe-Workflows |
| Abrechnung, Lagerabrechnung, Schlussabrechnung | CH / DE | Auswertung + Export pro Bommel |
| Abschliessen, archivieren, festschreiben | CH / DE | siehe `02` → Abschluss/Festschreibung |
| Kontenplan, Kontenrahmen, SKR49, Kontenplan KMU/Verein | CH / DE | ❌ kein Kontenrahmen (Kategorien = freie Labels) |
| MIDATA | CH | Mitgliederdatenbank der Pfadibewegung Schweiz (Software **hitobito**) mit OAuth2/OIDC → Login via Identity-Provider in Keycloak, siehe `03` |
| hitobito | CH | Open-Source-Vereinsverwaltung (Puzzle ITC), Basis von MIDATA, Jubla-DB u. a.; bietet OAuth2/OIDC |
| nDSG / revDSG | CH | Schweizer Datenschutzgesetz (seit 09/2023) – siehe `03` |
| Aufbewahrungspflicht 10 Jahre | CH (OR Art. 958f) / DE (§147 AO, GoBD) | siehe `03` → Aufbewahrung |
