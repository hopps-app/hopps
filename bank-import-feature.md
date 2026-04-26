# Feature: Bankdatenimport (CSV)

> **Status:** Entwurf / In Diskussion
> **Autor:** Manuel Hummler (mit Claude)
> **Letzte Änderung:** 2026-04-26

## 1. Ziel & Scope

Vereine sollen ihre Banktransaktionen per CSV-Export aus dem Online-Banking in Hopps importieren können, um sie später mit den manuell erfassten Buchungstransaktionen (`Transaction`) zu verknüpfen.

### 1.1 Im Scope (MVP)

- Anlegen und Verwalten **mehrerer Bankkonten** pro Organisation
- Definition eines **bankspezifischen CSV-Mapping-Schemas** pro Bank/Konto (mehrere Schemata möglich, da Banken unterschiedliche Exportformate liefern)
- **CSV-Upload** mit Vorschau und Validierung
- **Persistente Speicherung** der importierten Bankbewegungen
- **Anzeige/Listing** der importierten Bewegungen je Bankkonto (filter-/sortierbar)
- **Duplikatserkennung** bei Re-Import derselben Datei oder überlappender Zeiträume

### 1.2 Out of Scope (vorerst)

- Automatische oder manuelle Verknüpfung Bankbewegung ↔ `Transaction` (Reconciliation) — kommt später
- PSD2/HBCI/FinTS Direktanbindung an Banken (nur CSV-Upload)
- MT940/CAMT.053 Formate (nur CSV im MVP, andere Formate als Erweiterung später denkbar)
- Buchungsregeln/Auto-Kategorisierung
- Bank-Dashboards (Saldo-Verlauf, Liquiditätsplanung)

---

## 2. Entscheidungen & Offene Fragen

### 2.1 ✅ Bereits entschieden

| # | Entscheidung |
|---|---|
| **Q1** | Bankkonto wird an einen **Bommel** gehängt (FK `bommel_id`, required). Standardfall: Bankkonto hängt am **Root-Bommel** (= Organisation). Power-User können Bankkonten an Sub-Bommels (Abteilungen, Projekte) hängen. **MVP-UI**: zunächst nur Root-Bommel-Kontext sichtbar; Bommel-Auswahl wird später in der UI ergänzt. Datenmodell ist von Anfang an dafür ausgelegt. |
| **Q2** | Pflichtfelder beim Anlegen: `name` + `iban`. Alles andere optional. |
| **Q3** | Bankkonto erhält die optionalen Felder `openingBalance` (BigDecimal) + `openingBalanceDate` (Date). Damit ist der laufende Saldo auch bei Lücken im Import korrekt rekonstruierbar. |
| **Q4** | **Soft-Delete** für Bankkonten (`archived` Bool + `archivedAt` Timestamp). Archivierte Konten erscheinen standardmäßig nicht in Listen, Daten bleiben für Audit/Buchhaltung erhalten. Hartes Löschen nur über Org-Löschung (DSGVO). |
| **Q5** | Mapping-Schema ist **wiederverwendbar pro Organisation**. Gleiche Bank → ein Schema kann von mehreren Bankkonten genutzt werden. Bankkonto hat ein **Vorschlags-Schema** (`defaultSchema_id`), das im Import-Wizard vorausgewählt wird. |
| **Q6** | Vorgefertigte **System-Templates** werden mitgeliefert (Sparkasse in den drei Formaten MT940, CAMT v2, CAMT v8 als initiales Set). Architektur ist erweiterungsfreundlich: weitere Sparkasse-Formate (CAMT.053, weitere CAMT-Versionen, ältere proprietäre Exports) und andere Banken können als YAML/JSON-Resources nachgepflegt werden — ohne Code-Änderung oder DB-Migration. |
| **Q7** | **Mehrere Schemata pro Bankkonto** sind erlaubt. Im Import-Wizard ist das `defaultSchema` vorausgewählt, der User kann aber jederzeit ein anderes Org-Schema wählen (z.B. wenn die Bank parallel mehrere Formate anbietet, oder bei Format-Wechsel der Bank). |
| **Q12** | **Alle drei Vorzeichen-Strategien werden im MVP unterstützt**: `SIGNED_SINGLE_COLUMN` (Sparkasse), `DEBIT_CREDIT_COLUMNS` (Soll/Haben), `AMOUNT_PLUS_TYPE_COLUMN` (Betrag + S/H bzw. Lastschrift/Gutschrift Indikator). Schema-UI bietet alle drei Varianten an. |
| **Q12b** | MT940-Verwendungszweck-Blob (`EREF+...MREF+...CRED+...SVWZ+...ABWA+...KREF+...`) wird beim Import automatisch in die strukturierten Felder zerlegt. So liefern MT940- und CAMT-Importe identisch befüllte Daten. |
| **Q13** | **Asynchroner Import mit Job-Status**. POST liefert `202 Accepted` mit `jobId`, Frontend pollt Status-Endpoint. Neuer `BankImport.status`-Wert `QUEUED`. Implementierung: einfacher in-process Worker via Quarkus `@Scheduled` oder reactive messaging. Siehe §4.7 für Details. |
| **Q14** | Hybrider Duplikats-Hash: wenn `endToEndReference` vorhanden → Hash aus `bookingDate + amount + counterpartyIban + endToEndReference`; sonst Fallback auf `bookingDate + amount + counterpartyIban + purpose-normalisiert`. |
| **Q15** | Bei Fehlerzeilen: **Skip mit Report**. Fehlerhafte Zeilen werden übersprungen, im `BankImport.errorReport` strukturiert erfasst und im UI-Result angezeigt. Kein Komplettabbruch. |
| **Q16** | Original-Datei wird in S3 archiviert (für Audit, Re-Processing, Fehleranalyse). Aufbewahrungsdauer max. 30 Tage (DSGVO, siehe §6.5). |
| **Q17** | Preview-Schritt vor finalem Import ist Pflicht (Tabelle der geparsten Bewegungen, Fehler markiert, Duplikate gekennzeichnet). |
| **Q20** | Eigener Top-Level Nav-Punkt **„Bankkonten"** in der Sidebar. |
| **Q21** | Kontoübergreifende Bewegungs-Übersicht ist Teil des MVP (zweiter Tab neben „Konten"). Filterbar nach Konto/Zeitraum/Status, mit Aggregation der Summen. Siehe §5.2 S6. |
| **Q22** | `status` wird **bereits im MVP** gespeichert (UNMATCHED/PARTIALLY_MATCHED/FULLY_MATCHED/IGNORED). Datenmodell sieht **N:M Verknüpfung** zwischen BankTransaction und Transaction(-Position) vor (siehe §3.6 `BankTransactionMatch`). |

### 2.2 ❓ Noch offen

*Alle initialen Fragen sind beantwortet. Neue Fragen entstehen vermutlich erst im Wireframing/Implementierung — werden hier nachgepflegt.*

---

## 2.3 Sparkasse CSV-Formate — Analyse der Beispieldateien

Manuel hat drei reale Sparkasse-Exports geliefert. Alle drei zeigen dasselbe Konto im selben Zeitraum, aber in unterschiedlichen Formatversionen. Diese Analyse ist die Referenz für den Sparkasse-Template-Entwurf.

| Eigenschaft | MT940 (Legacy) | CAMT.052 v2 | CAMT.052 v8 |
|---|---|---|---|
| Anzahl Spalten | **11** | **17** | **17** |
| Buchungstext-Format | abgekürzt (`GUTSCHR. UEBERWEISUNG`) | abgekürzt (`GUTSCHR. UEBERWEISUNG`) | ausgeschrieben (`GUTSCHRIFT UEBERWEISUNG`) |
| Verwendungszweck | **Ein Blob** mit Prefixen `EREF+...MREF+...CRED+...SVWZ+...ABWA+...` | Nur SVWZ-Inhalt (Klartext) | Nur SVWZ-Inhalt (Klartext) |
| Strukturierte SEPA-Felder | nein (alles im Verwendungszweck) | **ja** (Glaeubiger ID, Mandatsreferenz, Kundenreferenz E2E, Sammlerreferenz) | **ja** (identisch zu v2) |
| Kontonummer-Spalte | `Kontonummer` + `BLZ` | `Kontonummer/IBAN` + `BIC (SWIFT-Code)` | `Kontonummer/IBAN` + `BIC (SWIFT-Code)` |
| Gemeinsamkeiten | Delimiter `;`, Quote `"`, Datum `dd.MM.yy` (zweistellig!), Dezimal `,`, signierter Betrag in einer Spalte, Encoding zeigt Mojibake (`R�ckzahlung`, `f�r`) → Original ist **Windows-1252 / ISO-8859-1**, nicht UTF-8 ||

### Konsequenzen für Implementierung

1. **Drei separate Sparkasse-Templates** als System-Vorlagen mitliefern (`Sparkasse MT940`, `Sparkasse CAMT.052 v2`, `Sparkasse CAMT.052 v8`).
2. **Encoding-Detection ist Pflicht** — Standardannahme bei Sparkasse-Dateien: Windows-1252. Falsch dekodierte Dateien (`R�ckzahlung` statt `Rückzahlung`) sind unbrauchbar.
3. **Datumsformat `dd.MM.yy` (2-stelliges Jahr)** — Java `DateTimeFormatter` mit Pivot-Year (z.B. ab 2050 = 19xx, davor = 20xx).
4. **MT940-Verwendungszweck-Parser**: muss die Prefixe `EREF+`, `MREF+`, `CRED+`, `SVWZ+`, `ABWA+`, `KREF+` zerlegen, damit MT940-Importe nach dem Parsing dieselben strukturierten Felder befüllen wie CAMT (siehe Q12b).
5. **Whitespace-Normalisierung**: CAMT-Exports haben oft trailing Spaces in Spalten (z.B. `"MSFT . E0800Z9AJA "`). Trim beim Parsing nötig.
6. **Mehrzeilige Adressen in Beguenstigter/Zahlungspflichtiger** (CAMT enthält die Bank-Adresse mit eingebetteten Spaces). Ggf. erste Zeile = Name, Rest = Adresse → erstmal alles in `counterpartyName`, später strukturiert.

### Sparkasse-Template Spalten-Mapping (Referenz)

| Kanonisches Feld | MT940 (Index) | CAMT v2/v8 (Index) |
|---|---|---|
| `BOOKING_DATE` | 1 (Buchungstag) | 1 (Buchungstag) |
| `VALUE_DATE` | 2 (Valutadatum) | 2 (Valutadatum) |
| `TRANSACTION_TYPE` | 3 (Buchungstext) | 3 (Buchungstext) |
| `PURPOSE` | 4 (parsed: SVWZ-Teil) | 4 (Verwendungszweck) |
| `END_TO_END_REFERENCE` | 4 (parsed: EREF-Teil) | 7 (Kundenreferenz End-to-End) |
| `MANDATE_REFERENCE` | 4 (parsed: MREF-Teil) | 6 (Mandatsreferenz) |
| `CREDITOR_ID` | 4 (parsed: CRED-Teil) | 5 (Glaeubiger ID) |
| `COUNTERPARTY_NAME` | 5 (Beguenstigter) | 11 (Beguenstigter) |
| `COUNTERPARTY_IBAN` | 6 (Kontonummer) | 12 (Kontonummer/IBAN) |
| `COUNTERPARTY_BIC` | 7 (BLZ) | 13 (BIC) |
| `AMOUNT` | 8 (Betrag, signiert) | 14 (Betrag, signiert) |
| `CURRENCY` | 9 (Waehrung) | 15 (Waehrung) |

> **Empfohlenes Sparkasse-Default**: CAMT.052 v8 — strukturierte Felder, ausgeschriebener Buchungstext, neuestes Format.

---

## 3. Datenmodell (Entwurf v1)

> Notation: Felder mit `?` sind optional/nullable. Alle Entities haben implizit `created_at`, `updated_at`, `created_by`.

### 3.1 `BankAccount`

| Feld | Typ | Bemerkung |
|---|---|---|
| `id` | Long (PK) | |
| `organization_id` | FK Organization | **denormalisiert** für schnelle Queries (analog zu Transaction) |
| `bommel_id` | FK Bommel | **required**. Standardfall: root-Bommel der Org. Power-User: Sub-Bommel für Abteilungs-/Projektkonten. Siehe §5.6 für UI-Phasen. |
| `name` | String | **required**, z.B. "Hauptkonto Sparkasse" |
| `iban` | String | **required** (Q2). Validiert (IBAN-Format) |
| `bic` | String? | |
| `bankName` | String? | freier Text, z.B. "Sparkasse Pfaffenhofen" |
| `accountHolder` | String? | |
| `currency` | String | ISO 4217, default `EUR` |
| `openingBalance` | BigDecimal? | siehe Q3 |
| `openingBalanceDate` | Date? | |
| `description` | String? | |
| `color` | String? | UI-Hex z.B. `#3b82f6`, für kontoübergreifende Übersicht |
| `defaultSchema_id` | FK BankCsvSchema? | Vorschlags-Schema im Import-Wizard. User darf abweichen (siehe Q7). |
| `archived` | Boolean | Soft-Delete, default false |
| `archivedAt` | Instant? | wenn `archived=true`, Zeitstempel der Archivierung |

**Constraint:** `bommel_id` muss zur `organization_id` gehören (Application-level check via `OrganizationContext`). DB-Constraint nicht trivial wegen denormalisiertem org_id — daher Test-Coverage auf Service-Ebene.

**Soft-Delete-Verhalten:**
- `archived=true` → Konto erscheint nicht in Standard-Listen, kein Import möglich
- BankTransaction/BankImport-Daten bleiben unverändert
- Wiederherstellung möglich (`archived=false` setzen)
- Hartes Löschen nur kaskadierend bei Org-Löschung (siehe §6.5)

### 3.2 `BankCsvSchema`

Definiert, **wie** eine CSV einer bestimmten Bank zu interpretieren ist.

| Feld | Typ | Bemerkung |
|---|---|---|
| `id` | Long (PK) | |
| `organization_id` | FK Organization | scoped per Org |
| `name` | String | z.B. "Sparkasse Standard 2024" |
| `bankIdentifier` | String? | optional BIC/Hash zur Auto-Erkennung |
| `delimiter` | char | `,`, `;`, `\t` |
| `quoteChar` | char | default `"` |
| `encoding` | String | `UTF-8`, `windows-1252`, `ISO-8859-1` |
| `skipLines` | int | Metadaten-Zeilen vor Header |
| `hasHeader` | boolean | |
| `dateFormat` | String | z.B. `dd.MM.yyyy` (Java DateTimeFormatter Pattern) |
| `decimalSeparator` | char | `,` oder `.` |
| `thousandSeparator` | char? | |
| `amountStrategy` | enum | siehe §3.2.1 — alle 3 Varianten im MVP |
| `amountTypePositiveValues` | String[]? | nur bei Strategy `AMOUNT_PLUS_TYPE_COLUMN`: Werte, die als „Eingang" interpretiert werden (z.B. `["H", "C", "Gutschrift", "Eingang"]`) |
| `columnMappings` | JSON oder Sub-Tabelle | siehe 3.3 |

#### 3.2.1 Vorzeichen-Strategien (`amountStrategy`)

Alle drei Strategien werden im MVP unterstützt. Pro Strategie sind unterschiedliche Spalten-Mappings Pflicht; die Validierung erfolgt beim Speichern des Schemas.

| Strategy | Pflicht-Mappings | Parser-Logik | Beispiel-Bank |
|---|---|---|---|
| `SIGNED_SINGLE_COLUMN` | `AMOUNT` | `amount = parse(rohwert)` — Vorzeichen ist im Wert | Sparkasse, DKB, ING (modern) |
| `DEBIT_CREDIT_COLUMNS` | `DEBIT_AMOUNT` + `CREDIT_AMOUNT` | wenn `DEBIT_AMOUNT` ≠ leer → `amount = -parse(debit)`, sonst `amount = +parse(credit)` | ältere Volksbank-Exports, manche Buchhaltungs-Tools |
| `AMOUNT_PLUS_TYPE_COLUMN` | `AMOUNT` + `AMOUNT_TYPE_INDICATOR` + `amountTypePositiveValues` | wenn Indikator-Wert in `amountTypePositiveValues` → positiv, sonst negativ | ältere DKB, manche internationale Banken |

**Edge-Case-Behandlung:**
- Bei `DEBIT_CREDIT_COLUMNS`: beide Spalten gleichzeitig befüllt → Fehlerzeile mit Hinweis
- Bei `AMOUNT_PLUS_TYPE_COLUMN`: Indikator-Wert nicht in Positiv-Liste UND nicht in Negativ-Liste → Fehlerzeile
- Beträge müssen immer **absolut** in der CSV stehen bei (b) und (c), Vorzeichen wird vom Parser gesetzt

### 3.3 `BankCsvColumnMapping` (Sub-Entity oder JSON in Schema)

Mappt eine **kanonische Zielspalte** auf eine Quellspalte der CSV.

| Feld | Typ | Bemerkung |
|---|---|---|
| `targetField` | enum | Siehe unten |
| `sourceColumnIndex` | int? | 0-basiert; alternativ name |
| `sourceColumnName` | String? | wenn `hasHeader=true` |
| `transform` | String? | optional, z.B. Regex-Capture |

**Kanonische Zielfelder (Enum `BankFieldType`):**
`BOOKING_DATE`, `VALUE_DATE`, `AMOUNT`, `DEBIT_AMOUNT`, `CREDIT_AMOUNT`, `AMOUNT_TYPE_INDICATOR`, `CURRENCY`, `PURPOSE`, `COUNTERPARTY_NAME`, `COUNTERPARTY_IBAN`, `COUNTERPARTY_BIC`, `TRANSACTION_TYPE`, `BANK_REFERENCE`, `BALANCE_AFTER`, `END_TO_END_REFERENCE`, `MANDATE_REFERENCE`, `CREDITOR_ID`

### 3.4 `BankImport`

Audit-Eintrag pro durchgeführtem Import.

| Feld | Typ | Bemerkung |
|---|---|---|
| `id` | Long (PK) | |
| `organization_id` | FK | |
| `bankAccount_id` | FK BankAccount | |
| `schema_id` | FK BankCsvSchema | |
| `fileName` | String | |
| `fileSize` | long | bytes |
| `fileSha256` | String | für Volldatei-Duplikatsdetektion |
| `s3FileKey` | String? | wenn Original archiviert wird (siehe Q16) |
| `importedBy` | FK Member | |
| `importedAt` | Instant | Zeitstempel Job-Erstellung |
| `startedAt` | Instant? | Zeitstempel als Worker den Job aufgegriffen hat |
| `finishedAt` | Instant? | Zeitstempel als Job abgeschlossen ist |
| `status` | enum | `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `PARTIAL` (siehe §4.7) |
| `progress` | int | 0–100, für UI-Progressbar |
| `totalRows` | int | |
| `importedRows` | int | |
| `duplicateRows` | int | |
| `errorRows` | int | |
| `errorReport` | TEXT/JSON? | strukturierte Liste fehlerhafter Zeilen mit Roh-CSV + Fehlermeldung |
| `failureReason` | String? | High-Level Grund bei `FAILED` (z.B. "Encoding nicht erkennbar") |

### 3.5 `BankTransaction`

Eine geparste Bankbewegung.

| Feld | Typ | Bemerkung |
|---|---|---|
| `id` | Long (PK) | |
| `organization_id` | FK | |
| `bankAccount_id` | FK | required |
| `import_id` | FK BankImport | required, für Trace |
| `bookingDate` | LocalDate | |
| `valueDate` | LocalDate? | |
| `amount` | BigDecimal | signiert (negativ = Ausgang) |
| `currency` | String | |
| `purpose` | TEXT | "Verwendungszweck", oft mehrzeilig |
| `counterpartyName` | String? | |
| `counterpartyIban` | String? | |
| `counterpartyBic` | String? | |
| `transactionType` | String? | bankspezifisch z.B. "GUTSCHRIFT", "LASTSCHRIFT" |
| `bankReference` | String? | falls Bank eine eindeutige ID liefert |
| `endToEndReference` | String? | SEPA E2E-ID |
| `mandateReference` | String? | SEPA Mandat |
| `creditorId` | String? | SEPA Creditor-ID |
| `balanceAfter` | BigDecimal? | falls Bank Saldo mitschickt |
| `rawRow` | TEXT/JSON | Original-CSV-Zeile, für Debug & Traceability |
| `dedupeHash` | String (indexed) | siehe Q14 |
| `status` | enum | `UNMATCHED`, `PARTIALLY_MATCHED`, `FULLY_MATCHED`, `IGNORED` |
| `matchedAmount` | BigDecimal | aufsummierte Match-Beträge (denormalisiert für schnelles Filtern; default 0) |

> Kein direkter `matchedTransaction_id` mehr, weil eine BankTransaction künftig **mit mehreren Transaction(-Positionen)** verknüpft werden kann (N:M, siehe §3.6).

### 3.6 `BankTransactionMatch` *(reserviert für Phase 2 — Reconciliation)*

Schon im MVP-Schema **angelegt**, damit später keine Migration nötig ist. UI/Logik kommt später.

| Feld | Typ | Bemerkung |
|---|---|---|
| `id` | Long (PK) | |
| `bankTransaction_id` | FK BankTransaction | |
| `transaction_id` | FK Transaction | später ggf. `transactionLineItem_id` als Alternative (siehe Hinweis) |
| `matchedAmount` | BigDecimal | Teilbetrag des Matches (ermöglicht: 1 Bank = N Buchungen *und* N Bank = 1 Buchung) |
| `direction` | enum | `BANK_TO_TRANSACTION`, `TRANSACTION_TO_BANK` (für Audit, ggf. weglassen) |
| `matchedAt` | Instant | |
| `matchedBy` | FK Member | |
| `matchType` | enum | `MANUAL`, `AUTO_RULE`, `AUTO_AI` (zukünftig) |
| `notes` | TEXT? | optional User-Kommentar |

**Constraints / Invarianten:**
- Sum(`matchedAmount` aller Matches einer BankTransaction) ≤ `BankTransaction.amount` (absolut)
- Sum(`matchedAmount` aller Matches einer Transaction) ≤ `Transaction.total` (absolut)
- Wenn Summe == BankTransaction.amount → Status `FULLY_MATCHED`, sonst `PARTIALLY_MATCHED`

**Hinweis Beleg-Positionen:** Die User-Anforderung erwähnt explizit, dass auch *Beleg-Positionen* mit Bank-Transaktionen verknüpfbar sein sollen. Aktuell hat Hopps **keine** `TransactionLineItem`-Entity. Wenn das später eingeführt wird, hat `BankTransactionMatch` zusätzlich ein nullable `transactionLineItem_id` (XOR mit `transaction_id`). Diese Entscheidung verschieben wir auf Phase 2.

### 3.7 ER-Skizze

```
Organization 1───* Bommel 1───* BankAccount 1───* BankTransaction *───1 BankImport
                                    │                  │
                                    │                  *  (N:M via BankTransactionMatch)
                                    │                  *
                                    │              Transaction (Phase 2)
                                    │
                                    └───?1 BankCsvSchema (default — vorgeschlagen, nicht verbindlich)

Organization 1───* BankCsvSchema 1───* BankCsvColumnMapping
```

**Hinweis Bommel-Hierarchie:** Da Bommels einen Baum bilden, gehört ein Bankkonto an einem Sub-Bommel implizit auch zur Organisation (über `Bommel.parent` → ... → root). Die kontoübergreifende Übersicht (§5.2 S6) listet alle Konten der Org, unabhängig vom Bommel-Anhängepunkt.

---

## 4. Architektur-Implementierung (Entwurf)

### 4.1 Backend — Vertical Slice

Neuer Slice `app.hopps.bankimport` (alternativ: `app.hopps.banking`) im `app.hopps.org` Service, da eng an `Organization` und perspektivisch an `Transaction` gekoppelt.

```
backend/app.hopps.org/src/main/java/app/hopps/bankimport/
├── api/
│   ├── BankAccountResource.java       # CRUD Bankkonten
│   ├── BankCsvSchemaResource.java     # CRUD Schemata
│   ├── BankImportResource.java        # POST /import (multipart) + GET History
│   ├── BankTransactionResource.java   # GET (list/filter/detail)
│   └── dto/
│       ├── BankAccountRequest.java        (record)
│       ├── BankAccountResponse.java       (record)
│       ├── BankCsvSchemaRequest.java      (record)
│       ├── BankCsvSchemaResponse.java     (record)
│       ├── CsvPreviewRequest.java         (record)
│       ├── CsvPreviewResponse.java        (record)
│       └── BankTransactionResponse.java   (record)
├── domain/
│   ├── BankAccount.java
│   ├── BankCsvSchema.java
│   ├── BankCsvColumnMapping.java
│   ├── BankImport.java
│   ├── BankTransaction.java
│   ├── BankTransactionMatch.java   # leer/dormant in Phase 1, Schema vorhanden
│   ├── BankFieldType.java
│   └── BankTransactionStatus.java
├── repository/
│   ├── BankAccountRepository.java
│   ├── BankCsvSchemaRepository.java
│   ├── BankImportRepository.java
│   └── BankTransactionRepository.java
├── parser/
│   ├── CsvParser.java                  # Apache Commons CSV Wrapper
│   ├── EncodingDetector.java           # juniversalchardet
│   ├── DelimiterDetector.java          # Heuristik
│   ├── Mt940PurposeParser.java         # Zerlegt EREF+/MREF+/CRED+/SVWZ+/ABWA+ Blob
│   └── DateAmountParser.java           # dd.MM.yy + Pivot-Year, Dezimal-/Tausendertrenner
└── service/
    ├── BankAccountService.java
    ├── BankCsvSchemaService.java
    ├── SystemTemplateService.java   # Liefert Sparkasse-Templates (Code-/Resource-basiert)
    ├── CsvPreviewService.java       # Encoding-/Delimiter-Detection, erste N Zeilen
    ├── CsvImportService.java        # Orchestrierung des Imports
    ├── DedupeHashService.java
    └── ImportFileStorageService.java # S3 für archivierte Originaldateien
```

**Begründung:** Folgt dem in CLAUDE.md beschriebenen Vertical-Slice-Plan. Konsistent mit `app.hopps.transaction/`.

### 4.2 Empfohlene Bibliotheken

- **CSV Parsing:** [Apache Commons CSV](https://commons.apache.org/csv/) — robust, einfach, unterstützt verschiedene Dialekte. Alternative: univocity-parsers (schneller, mehr Features, aber größere Dependency).
- **Encoding Detection:** [Mozilla universalchardet (juniversalchardet)](https://github.com/albfernandez/juniversalchardet) — erkennt Windows-1252 / UTF-8 / ISO-8859-1 mit hoher Trefferquote.
- **Delimiter Detection:** Eigene Heuristik (zähle `;`, `,`, `\t` in den ersten N Zeilen).

### 4.3 Flyway Migration

Neue Migration `V1.0.13__bank_import.sql` mit den 6 Tabellen + Indexes:
- Index auf `bank_transaction(bank_account_id, booking_date)` für schnelle Listing-Abfragen
- Index auf `bank_transaction(bank_account_id, status)` für Filter "nur unmatched"
- Unique-Index auf `bank_transaction(bank_account_id, dedupe_hash)` für Duplikatserkennung
- Index auf `bank_transaction_match(bank_transaction_id)` und `bank_transaction_match(transaction_id)`
- Index auf `bank_csv_schema(organization_id)` und `bank_account(organization_id)`

System-Templates (Sparkasse MT940/CAMT v2/CAMT v8) werden **nicht** als Daten-Migration eingespielt, sondern bei Bedarf über einen `SystemTemplateService` aus YAML-/JSON-Resources erzeugt — sonst wären sie nicht updatebar ohne neue Org-Migration.

### 4.4 REST API (Entwurf)

```
# Bankkonten
GET    /bankaccounts                          # Liste aktiver Konten der Org (?includeArchived=true für alle)
POST   /bankaccounts                          # Neues Konto (bommel_id default = root-Bommel)
GET    /bankaccounts/{id}
PUT    /bankaccounts/{id}
DELETE /bankaccounts/{id}                     # Soft-Delete (setzt archived=true, archivedAt=now)
POST   /bankaccounts/{id}/restore             # Wiederherstellung (archived=false)

# Bankbewegungen
GET    /bankaccounts/{id}/transactions        # Bewegungen eines Kontos (paginiert/filterbar)
GET    /bank-transactions                     # Kontoübergreifend (mit ?accountIds=, ?status=, ?dateFrom=, ?dateTo=)
GET    /bank-transactions/aggregate           # Summen Eingang/Ausgang/Netto im Filter
GET    /bank-transactions/{id}                # Detailansicht

# Schema-Verwaltung
GET    /bank-schemas                          # Schemata der Org
POST   /bank-schemas                          # Neues Schema (optional ?fromTemplate=sparkasse-camt-v8)
GET    /bank-schemas/{id}
PUT    /bank-schemas/{id}
DELETE /bank-schemas/{id}                     # nur wenn nicht referenziert
GET    /bank-schemas/templates                # Liste verfügbarer System-Templates

# Import (asynchron)
POST   /bankaccounts/{id}/preview             # Multipart: file
                                              # SYNCHRON: detected encoding/delimiter,
                                              # erste 20 Rohzeilen, Header-Vorschlag
                                              # → CsvPreviewResponse

POST   /bankaccounts/{id}/imports             # Multipart: file + schemaId
                                              # → 202 Accepted
                                              # Body: { "importId": 42, "statusUrl": "/imports/42" }

GET    /bankaccounts/{id}/imports             # Import-Historie (alle Status)
GET    /imports/{id}                          # Job-Status: { status, progress, totalRows, importedRows,
                                              #   duplicateRows, errorRows, errorReport, failureReason }
DELETE /imports/{id}                          # Rollback eines fehlgeschlagenen oder versehentlichen Imports
                                              # (löscht alle BankTransactions dieses Imports)
```

**Anti-Pattern-Vermeidung:** Status-Polling-Endpoint nutzt **HTTP 200** mit Status im Body (kein 202 für „noch nicht fertig"), damit Clients einfacher mit React Query arbeiten können.

### 4.5 Multi-Tenancy

Alle Repositories scopen über `OrganizationContext.getCurrentOrganization()` analog zu `TransactionRepository.findByIdScoped()`. Schemata sind Org-scoped (kein Cross-Org-Sharing im MVP).

### 4.6 Asynchrone Import-Verarbeitung

#### Status-Lifecycle

```
        ┌─────────┐  Worker greift Job auf
        │ QUEUED  │──────────────┐
        └─────────┘              ▼
             ▲             ┌────────────┐
             │             │ PROCESSING │
       Initial             └────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
        ┌──────────┐      ┌─────────┐       ┌────────┐
        │COMPLETED │      │ PARTIAL │       │ FAILED │
        └──────────┘      └─────────┘       └────────┘
        (alle ok)         (Skip mit          (kompletter
                          Fehlerzeilen)      Abbruch z.B.
                                             Encoding broken)
```

#### Implementierung (MVP-Variante)

Einfacher in-process Worker via Quarkus:

1. **POST /bankaccounts/{id}/imports** (Endpoint):
   - Lädt Datei in S3 unter `bank-imports/{orgId}/{uuid}/{filename}`
   - Erzeugt `BankImport` mit `status=QUEUED`, `s3FileKey`, `schemaId`
   - Returnt `202 Accepted` + `importId`
2. **`@Scheduled(every = "5s")`** in `BankImportWorker`:
   - Polled: `BankImport.find("status", QUEUED).firstResult()`
   - Setzt `status=PROCESSING, startedAt=now`
   - Lädt Datei aus S3, parst, schreibt `BankTransaction` Zeilen, aktualisiert Counter & Progress
   - Setzt finalen Status (`COMPLETED` / `PARTIAL` / `FAILED`) + `finishedAt`

**Skalierung später:** Bei Bedarf auf Kafka oder Quarkus Reactive Messaging migrieren — Datenmodell ändert sich nicht.

#### Watchdog (Empfehlung, kein MVP-Blocker)

Wenn Worker-Pod crasht während `PROCESSING`, bleibt der Job hängen. Zusätzliche Scheduled-Task (z.B. alle 10 Min): Jobs mit `status=PROCESSING` und `startedAt > 30 Min` → setze auf `FAILED` mit `failureReason="Worker timeout"`.

#### Frontend-Integration

- Wizard-Schritt 5 zeigt Live-Progress:
  - Polling via React Query mit `refetchInterval` (z.B. 2s) auf `GET /imports/{id}`
  - Polling stoppt sobald `status` ein Endzustand ist (COMPLETED/PARTIAL/FAILED)
  - UI zeigt Progressbar (`progress`-Feld) + Live-Counter (importedRows / totalRows)
  - Bei `PARTIAL`: Hinweis-Banner mit Anzahl Fehler + Klick auf „Details" zeigt `errorReport`
- Wizard ist **nicht modal-blockierend**: User darf den Wizard schließen, Import läuft im Hintergrund weiter, Notification zeigt bei Abschluss („3.421 Bewegungen importiert")

#### Fehler-Reporting

`errorReport` (JSON-Spalte oder TEXT) Struktur:
```json
{
  "errors": [
    { "rowNumber": 17, "rawRow": "DE91...;...;...", "field": "AMOUNT", "message": "Cannot parse '12.34.56' as decimal" },
    { "rowNumber": 42, "rawRow": "...", "field": "BOOKING_DATE", "message": "Invalid date format" }
  ]
}
```

### 4.7 API-Client Workflow

Nach Backend-Änderung gemäß CLAUDE.md:
1. Swagger-Annotations (`@Operation`, `@APIResponse`, `@Parameter`) **Pflicht** auf jedem neuen Endpoint
2. `./mvnw compile` im `app.hopps.org` Service
3. `cd frontend/api-client && pnpm run generate-local && pnpm run build`
4. Neue Methoden via `@hopps/api-client` in SPA verwenden

---

## 5. UI / UX (Entwurf)

> Annahme: Web-SPA hat Priorität. Mobile zunächst out-of-scope (aber API-Client teilt sich).

### 5.1 Navigation

Vorschlag: neuer Menüpunkt **„Bankkonten"** in der Hauptnavigation (Sidebar), parallel zu „Belege" / „Buchungen".

### 5.2 Screens

#### S1 — Bankkonten-Übersicht (`/bank-accounts`)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Bankkonten                                          [+ Neues Bankkonto]   │
│  ─────────────────────────────────────────────────────────────────────────  │
│  [● Konten]  [○ Alle Bewegungen]                    Archivierte ☐          │
│                                                                            │
│  ┌──────────────────────────┐  ┌──────────────────────────┐                │
│  │ ●  Hauptkonto Sparkasse  │  │ ●  Spendenkonto GLS      │                │
│  │    DE91 •••• 5095        │  │    DE12 •••• 4287        │                │
│  │    Sparkasse Pfaffenhofen│  │    GLS Bank              │                │
│  │    ─────────────         │  │    ─────────────         │                │
│  │    Saldo:    +12.840,55 €│  │    Saldo:    +3.205,00 € │                │
│  │    Bewegungen:       247 │  │    Bewegungen:        38 │                │
│  │    Letzter Import:       │  │    Letzter Import:       │                │
│  │    vor 2 Tagen           │  │    vor 3 Wochen          │                │
│  │                          │  │                          │                │
│  │      [📥 CSV importieren]│  │      [📥 CSV importieren]│                │
│  └──────────────────────────┘  └──────────────────────────┘                │
│                                                                            │
│  ┌──────────────────────────┐                                              │
│  │ +                        │                                              │
│  │   Neues Bankkonto        │                                              │
│  │   anlegen                │                                              │
│  └──────────────────────────┘                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

**Annotationen:**
- Karten-Grid (3 Spalten desktop, 2 tablet, 1 mobile). Letzte Karte ist immer „Neues Bankkonto"-Aktion (auch als CTA in der Header-Zeile)
- `●` = Farbpunkt aus `BankAccount.color` — gleiche Farbe in Cross-Account-View und Detail-Header
- IBAN maskiert: `DE91 •••• 5095` (erste 4 + letzte 4 Stellen). Bei Hover: vollständig
- Saldo nur sichtbar wenn `openingBalance` gesetzt ODER mindestens ein Import vorhanden (sonst „—")
- „Letzter Import: vor X Tagen" → klickbar, springt zu S3 Tab „Import-Historie"
- Schnell-CTA „CSV importieren" auf jeder Karte → öffnet Wizard direkt mit dem Konto vorausgewählt
- Toggle „Archivierte ☐" oben rechts: zeigt zusätzlich archivierte Konten (gegraut)
- Klick auf Karten-Body (außerhalb Buttons) → S3 Bankkonto-Detail

**Empty State (keine Konten):**
```
┌────────────────────────────────────────────────────────────────────────────┐
│  Bankkonten                                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                            │
│                            🏦                                              │
│                                                                            │
│              Noch keine Bankkonten angelegt                                │
│                                                                            │
│   Lege dein erstes Bankkonto an, um Bankbewegungen aus CSV zu importieren  │
│                                                                            │
│                  [+ Erstes Bankkonto anlegen]                              │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

#### S2 — Bankkonto Anlegen/Bearbeiten (Modal/Drawer)

```
┌────────────────────────────────────────────────────────┐
│  Neues Bankkonto                                  [×]  │
│  ────────────────────────────────────────────────────  │
│                                                        │
│  Name *                                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Hauptkonto Sparkasse                              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  IBAN *                                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │ DE91 7215 1650 0009 5415 09                       │  │
│  └──────────────────────────────────────────────────┘  │
│  ✓ Gültige IBAN — Sparkasse Pfaffenhofen erkannt       │
│                                                        │
│  ▼ Optionale Angaben                                   │
│  ┌────────────────────┬────────────────────────────┐   │
│  │ BIC                │ Bankname                   │   │
│  │ BYLADEM1PAF        │ Sparkasse Pfaffenhofen     │   │
│  └────────────────────┴────────────────────────────┘   │
│                                                        │
│  Kontoinhaber                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Open Project e.V.                                 │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Währung          Farbe                                │
│  ┌────────────┐  [● ● ● ● ● ● ● ●]                     │
│  │ EUR     ▾ │   blau ausgewählt                      │
│  └────────────┘                                        │
│                                                        │
│  Eröffnungssaldo  Datum                                │
│  ┌────────────┐  ┌────────────┐                        │
│  │ 0,00     € │  │ 01.01.2026 │   (optional, für      │
│  └────────────┘  └────────────┘    Saldo-Berechnung)  │
│                                                        │
│  Beschreibung                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │                                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  Standard-CSV-Schema (kann später geändert werden)     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ — Kein Standard —                             ▾ │  │
│  └──────────────────────────────────────────────────┘  │
│  Tipp: Schema wird beim ersten Import angelegt         │
│                                                        │
│  ────────────────────────────────────────────────────  │
│              [Abbrechen]    [Bankkonto anlegen]        │
└────────────────────────────────────────────────────────┘
```

**Annotationen:**
- IBAN-Validierung in Echtzeit (Format + Prüfziffer). Bei gültiger IBAN: BIC und Bankname werden aus eingebauter BLZ-Tabelle (z.B. SCHUFA-IBAN-Datenbank oder lokale BLZ-Liste der Bundesbank) **vorgeschlagen** — User kann überschreiben
- Optionale Felder sind in einem aufklappbaren Bereich („▼ Optionale Angaben") versteckt — Standard collapsed, damit die Form nicht erschlägt
- Farbe: 8 Tailwind-Standardfarben als Auswahl-Dots (`bg-blue-500`, `bg-green-500`, ...). Default: nächste verfügbare Farbe in Org
- Eröffnungssaldo + Datum als Paar — wenn eines befüllt, wird auch das andere Pflicht (Frontend-Validierung)
- Standard-Schema: zunächst leer („— Kein Standard —"), Hinweistext erklärt den Lazy-Workflow
- Bei **Bearbeiten-Modus**: zusätzliche Sektion am Ende: `[Konto archivieren]` (rot, mit Bestätigungs-Modal)
- Bommel-Selektor wird im MVP **nicht** angezeigt (siehe §5.6) — `bommel_id` automatisch auf Root-Bommel gesetzt

#### S3 — Bankkonto-Detail (`/bank-accounts/{id}`)
- Kopfbereich: Bankkonto-Infos, Aktion „CSV importieren"
- Tabelle: Bankbewegungen mit Spalten: Buchungsdatum, Verwendungszweck (gekürzt), Gegenpartei, Betrag, Status
- Filter: Datumsbereich, Status, Suchfeld (Verwendungszweck/Gegenpartei)
- Sekundärtab „Import-Historie"

#### S4 — Import-Wizard (Modal/Drawer, mehrstufig)

**Schritt 1 — Datei-Upload**
- Drag-and-Drop (analog zu Beleg-Upload, `react-dropzone`)
- Datei wird hochgeladen → Backend-Preview-Endpoint liefert: erkanntes Encoding, Delimiter, erste 10–20 Rohzeilen

**Schritt 2 — Schema wählen**
- Dropdown: vorhandene Schemata der Org
- Oder „+ Neues Schema definieren"
- Falls vorgefertigte Templates (Q6): Auswahlliste „Sparkasse / DKB / GLS / …"

**Schritt 3 — Mapping definieren** *(nur wenn neues Schema)*
- Tabelle: linke Spalte = kanonische Zielfelder, rechte Spalte = Dropdown der CSV-Spalten
- Live-Vorschau: aktuelles Mapping wird auf erste 5 Datenzeilen angewendet → User sieht das Ergebnis
- Konfiguration: Datumsformat, Dezimaltrenner, Vorzeichen-Strategie
- Speichern unter Name → wird Org-weit verfügbar

**Schritt 4 — Vorschau & Import**
- Tabelle der geparsten Bewegungen (Pagination, erste 50 sichtbar)
- Hinweise: „X Zeilen werden importiert, Y sind Duplikate (übersprungen), Z fehlerhaft"
- Fehlerhafte Zeilen können expandiert werden → zeigt Roh-CSV + Fehlermeldung
- Button „Import bestätigen"

**Schritt 5 — Ergebnis**
- Bestätigung mit Anzahl importierter/übersprungener/fehlerhafter Zeilen
- Link „Bewegungen ansehen" → führt zurück zur Detail-Tabelle

#### S5 — Schema-Verwaltung (`/bank-accounts/schemas`)
- Liste aller Org-Schemata
- Bearbeiten/Löschen (Löschen verboten, wenn Schema von BankAccount referenziert wird oder von Imports verwendet wurde → stattdessen archivieren)
- Beim Anlegen: Auswahl aus System-Templates (Sparkasse MT940 / CAMT v2 / CAMT v8 / weitere) oder „Leeres Schema". System-Template wird **dupliziert**, nicht referenziert — der User darf editieren ohne globale Auswirkung.

#### S6 — Kontoübergreifende Bewegungs-Übersicht (`/bank-accounts?tab=transactions`)

Zweiter Top-Level-Tab in der Bankkonten-Sektion neben „Konten".

**Layout:**
- Filterleiste oben:
  - Konto-Multiselect (Default: alle aktiven Konten)
  - Datumsbereich-Filter
  - Status-Filter (UNMATCHED / PARTIALLY_MATCHED / FULLY_MATCHED / IGNORED, multi)
  - Suche über Verwendungszweck/Gegenpartei
- Aggregations-Box: Summe Eingang / Summe Ausgang / Netto im aktuellen Filter
- Tabelle (AG Grid): `Datum | Konto (Farbpunkt + Name) | Gegenpartei | Verwendungszweck | Betrag | Status`
- Default-Sort: `bookingDate desc`
- Klick auf Zeile → Detail-Drawer (gleiche Komponente wie auf Konto-Detail)

**Use Cases:**
- „Wo ist Spende X eingegangen?" → kontoübergreifende Suche
- „Was wurde im April insgesamt ausgegeben?" → Aggregation
- „Welche Bewegungen sind noch nicht zugeordnet?" → Filter `UNMATCHED` über alle Konten (Reconciliation-Worklist)

**Technisch:** identische Query-Logik wie Konto-Detail-Liste, nur ohne `bankAccountId`-Filter. Spalte „Konto" zeigt das BankAccount-Color-Feld (siehe §3.1) als Farbpunkt + Name.

### 5.3 i18n

Neue Translation-Keys-Hierarchie:
- `bankAccounts.*` (Listing, Detail, Forms)
- `bankImport.*` (Wizard-Schritte, Fehler, Status)
- `bankSchema.*` (Mapping-UI)

Vollständig DE + EN gemäß CLAUDE.md.

### 5.4 Komponenten-Wiederverwendung

- Drag-Drop: bestehende `Dropzone`-Komponente aus Beleg-Upload nachnutzen
- Tabelle: AG Grid (bereits im Stack) für Bewegungs-Listing
- Wizard: Multi-Step-Pattern (entweder Radix Tabs oder eigener `Stepper`)

### 5.5 Wizard-Verhalten bei Async-Import

Da der Import asynchron läuft (siehe §4.6), ist der finale Wizard-Schritt **nicht modal-blockierend**:

- Nach Klick auf „Import bestätigen" sieht der User sofort eine Progress-Ansicht mit Live-Counter
- User kann den Wizard schließen — Import läuft im Hintergrund weiter
- Eine globale **Toast-Notification** zeigt nach Abschluss z.B. „3.421 Bewegungen importiert (12 Fehler)" mit Link zum Import-Detail
- Im Bereich „Import-Historie" sind laufende Jobs immer einsehbar (mit aktuellem Progress)
- Bei `FAILED` oder `PARTIAL`: Notification ist klickbar, führt zum Error-Report

### 5.6 Bommel-Kontext (UI-Phasen)

Das Datenmodell hängt jeden BankAccount an einen Bommel (Q1). Die UI exponiert das in zwei Phasen:

**Phase 1 — MVP:**
- Bei Anlage eines Bankkontos: `bommel_id` wird **automatisch auf den Root-Bommel** der aktuellen Org gesetzt (kein UI-Selector)
- Listenansichten zeigen alle Konten der Org ohne Bommel-Differenzierung
- User merkt nichts vom Bommel-Konzept beim Bankkontenmanagement

**Phase 2 — Erweiterung (später):**
- Bommel-Selector beim Anlegen/Bearbeiten eines Bankkontos
- Bommel-Filter in der kontoübergreifenden Übersicht
- Konten-Übersicht gruppiert/filterbar nach Bommel
- Use-Case: Verein hat „Hauptkonto" am Root-Bommel + „Spendenkonto Jugendabteilung" am Sub-Bommel „Jugend"

Diese Trennung erlaubt es, das Feature zügig auszuliefern, ohne später eine Migration zu brauchen.

---

## 6. Risiken & Tradeoffs

| Risiko | Maßnahme |
|---|---|
| CSV-Format-Heterogenität deutscher Banken (Sonderfälle, mehrzeilige Verwendungszwecke, exotische Encodings) | Konfigurierbares Schema + Auto-Detection als Fallback; System-Templates für Top-Banken |
| Duplikat-Hash unzuverlässig wenn Banken Verwendungszweck umformatieren (Whitespace, Umlaute) | Normalisierung vor Hashing (trim, NFKC, lower, collapse multiple spaces) + zusätzlich Datei-SHA256 auf `BankImport` für 1:1-Datei-Re-Imports |
| Große CSV-Dateien (Jahresabzüge mit > 5.000 Zeilen) blockieren synchron | Hard-Limit 5.000 Zeilen im MVP, async-Job später |
| User legt versehentlich mehrere Schemata für dieselbe Bank an | UI listet existierende Schemata bei Neuanlage; bei System-Template-Auswahl direkter Klon mit Hinweis auf Wiederverwendung |
| Sparkasse-CSVs sind Windows-1252 — bei falschem Encoding entstehen unleserliche Daten (`R�ckzahlung`) | EncodingDetector + harte Validierung: wenn nach Decode "REPLACEMENT CHARACTER" U+FFFD vorkommt → Fehler statt Import |
| MT940-Verwendungszweck-Parser missinterpretiert Sonderzeichen | Umfangreiche Unit-Tests mit den 3 Sparkasse-Beispieldateien als Fixtures, Snapshot-Tests für Parsing-Output |
| 2-stelliges Jahr im Datum führt nach 2050+ zu falscher Zuordnung | Pivot-Year konfigurierbar, default 2050 |

---

## 6.5 DSGVO-Checkliste

Die Bank-Daten enthalten besonders sensitive Informationen (IBAN, Gegenparteien-Identitäten, Spendenbescheinigungen, Lohnsteuer-Details — siehe Beispieldateien). Diese Checkliste muss vor Go-Live abgehakt sein.

### Rechtliche Grundlagen
- [ ] **Rechtsgrundlage** der Verarbeitung in Datenschutzerklärung dokumentieren (Art. 6 Abs. 1 lit. b DSGVO — Vertragserfüllung; ggf. lit. f — berechtigtes Interesse für Spendenverwaltung)
- [ ] **Verarbeitungsverzeichnis** (Art. 30 DSGVO) um „Bankdatenimport" erweitern (Datenarten, Empfänger, Speicherdauer, TOMs)
- [ ] **AVV** mit Hosting-Provider (S3-Speicher) prüfen — bestehender AWS-AVV deckt Bank-Daten ab?
- [ ] **Datenschutzhinweise** im UI direkt am Import-Wizard verlinken („Was passiert mit deiner CSV-Datei?")

### Datensparsamkeit (Art. 5 Abs. 1 lit. c)
- [ ] Nur Felder mit fachlichem Zweck importieren — z.B. **Sammlerreferenz** und **Auslagenersatz Ruecklastschrift** initial nicht übernehmen, falls nicht benötigt
- [ ] `rawRow` Feld: prüfen ob wirklich nötig oder nur in Fehlerfall speichern (Audit vs. Datensparsamkeit)
- [ ] User-konfigurierbar: optional Anonymisierung von Verwendungszweck nach X Monaten?

### Speicherdauer & Löschkonzept (Art. 5 Abs. 1 lit. e, Art. 17)
- [ ] **Original-CSV in S3**: max. **30 Tage** Aufbewahrung, danach automatischer Lifecycle-Delete (S3 Lifecycle-Rule). Begründung: Daten sind nach Import strukturiert in DB, Original nur für kurzfristige Reklamation/Audit nötig
- [ ] **BankTransaction-Daten**: Aufbewahrung gemäß **§147 AO 10 Jahre** (Buchführungsrelevant) — explizit dokumentieren
- [ ] **Recht auf Löschung**: API-Endpunkt `DELETE /organizations/{id}` muss alle BankAccount/BankImport/BankTransaction kaskadierend löschen (inkl. S3-Objekte)
- [ ] **Org-Auflösung**: Workflow zum vollständigen Bankdaten-Export vor Löschung (siehe Datenportabilität)

### Datenportabilität (Art. 20)
- [ ] Export-Funktion: User kann alle BankTransactions seiner Org als CSV/JSON exportieren

### Sicherheit (Art. 32 — TOMs)
- [ ] **Verschlüsselung at-rest**: S3 SSE-S3 oder SSE-KMS aktiviert
- [ ] **Verschlüsselung in-transit**: TLS für alle Endpoints (bestehend)
- [ ] **DB-Verschlüsselung**: PostgreSQL TDE oder Volume-Verschlüsselung auf Cluster-Ebene dokumentieren
- [ ] **Zugriffskontrolle**: jede API/Repo-Operation scoped per `OrganizationContext` (Standard)
- [ ] **Audit-Log**: `BankImport` erfasst wer/wann/was — ausreichend für Nachweis
- [ ] **S3-Bucket-Policy**: kein Public Access, nur Service-Account
- [ ] **S3-Pfade enthalten keine sensiblen Daten** (kein IBAN im Key, nur UUIDs)

### Pseudonymisierung / Logging
- [ ] Logs dürfen **keine** Verwendungszwecke / IBANs / Gegenparteien-Namen enthalten — Logger-Konfiguration prüfen
- [ ] Fehlermeldungen an User: keine Roh-Datenpreisgabe in System-Logs
- [ ] Bei Sentry/APM-Integration: Bank-Felder explizit auf Scrub-Liste setzen

### Betroffenenrechte
- [ ] **Auskunft (Art. 15)**: Export von Bank-Daten zu einer bestimmten Person (Gegenpartei) auf Anfrage möglich
- [ ] **Berichtigung (Art. 16)**: User kann BankTransaction-Felder editieren? Oder nur Status/Zuordnung? **Vorschlag: Bank-Daten read-only, nur Status/Match änderbar** (Integrität der Importquelle bewahren)
- [ ] **Widerspruch (Art. 21)**: dokumentierter Prozess

---

## 7. Nächste Schritte

1. ✏️ Restliche offene Fragen klären (Q1–Q4, Q7, Q12, Q12b, Q13–Q15, Q20–Q21)
2. ✏️ Datenmodell finalisieren (insbes. `BankTransactionMatch` Phase-2-Reife klären)
3. ✏️ Wireframes/Mockups für Wizard (figma_inspo nutzen)
4. 📦 Sparkasse-Beispiel-CSVs als Test-Fixtures ins Repo aufnehmen (anonymisierte Variante)
5. 📦 Flyway Migration `V1.0.13__bank_import.sql`
6. 📦 Domain & Repositories
7. 📦 CSV-Parser-Service inkl. MT940-Verwendungszweck-Parser + Tests gegen die 3 Sparkasse-Fixtures
8. 📦 System-Templates für Sparkasse (3 Formate) als YAML/JSON-Resource
9. 📦 REST Endpoints + Swagger-Annotations
10. 📦 API-Client regenerieren
11. 🎨 SPA-Implementierung (Listing → Konto-CRUD → Wizard)
12. 🧪 Pact-Tests, i18n-Strings, E2E-Test
13. 🔒 DSGVO-Checkliste (§6.5) abhaken vor Go-Live

