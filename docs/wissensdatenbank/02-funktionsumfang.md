# Funktionsumfang (Feature-Katalog)

_Stand: 2026-09-17 · Basis: Code-Analyse auf `feat/single-tenant-mode` (= `main` + Single-Tenant-Modus)_

Status-Skala siehe [README.md](README.md). Pfade relativ zu
`backend/app.hopps.org/src/main/java/app/hopps/` (= **BE**) bzw. `frontend/spa/src/` (= **SPA**).

> Bei Aussagen, die für eine Antwort entscheidend sind, den Beleg kurz im Code gegenprüfen –
> der Code entwickelt sich schneller als diese Datei.

---

## 1. Organisation & Struktur (Bommel-Baum)

| Funktion | Status | Details | Beleg |
|---|---|---|---|
| Organisation registrieren / Stammdaten | ✅ | Name, Slug, Typ, Adresse, Website, Logo | BE `organization/`, SPA `/register`, `/admin/ngo-details` |
| Rechtsformen | 🟡 | Nur deutsche Rechtsformen (e.V., gGmbH …) + `ANDERE` | BE `organization/domain/OrganizationType` |
| Hierarchische Struktur (Abteilungen, Gruppen, Projekte, Anlässe) | ✅ | Beliebig tiefer Baum, anlegen/umbenennen/verschieben/löschen, Emoji | BE `bommel/`, SPA `/structure` |
| Verantwortliche Person pro Bommel | 🟡 | Ein `responsibleMember` – rein informativ, **keine Rechte** | BE `bommel/domain/Bommel.java` |
| Beschreibung, Zeitraum (Start/Ende) pro Bommel | ❌ / 💡 | Felder fehlen; kleine Erweiterung | – |
| Bommel abschliessen / archivieren (read-only) | ❌ / 💡 | Kein Status am Bommel. Nur Transaktionen haben `DRAFT`/`CONFIRMED` | BE `transaction/` (`/confirm`, `/reopen`) |
| Vorlagen für Bommel/Anlässe | ❌ | – | – |

## 2. Belege (Quittungen, Rechnungen)

| Funktion | Status | Details | Beleg |
|---|---|---|---|
| Upload Foto/PDF (Web) | ✅ | PNG, JPEG, PDF; Drag & Drop; Dedupe per Datei-Hash | BE `document/api/DocumentResource` `POST /documents`, SPA `/receipts/new` |
| KI-Auslesung (OCR) | ✅ | Azure Document Intelligence + Azure OpenAI (beide EU/West Europe): Betrag, Datum, Partner, Steuer … vorbefüllt | Service `app.hopps.az-document-ai` (Stand 2026-09-28) |
| E-Rechnung ZUGFeRD auslesen | ✅ | XML aus PDF | Service `app.hopps.zugferd` |
| KI-Analyse abschaltbar | ✅ | Pro Organisation (`autoAnalyzeDocuments`) oder pro Upload (`?analyze=false`) | BE `organization/domain/Organization` |
| Prüfen/Bestätigen-Workflow | ✅ | Status `UPLOADED → ANALYZING → ANALYZED → CONFIRMED` / `FAILED`, Live-Updates per WebSocket | BE `document/domain/DocumentStatus`, `/ws/documents` |
| Beleg bearbeiten (Betrag, Kategorie, Bommel, Tags, Steuer, Fälligkeit) | ✅ | Jedes Mitglied der Organisation (keine Rollenprüfung) | `PATCH /documents/{id}`, `PATCH /transactions/{id}` |
| Beleg löschen | ✅ | **Hartes Löschen** inkl. Datei – kein Papierkorb, keine Rollenprüfung | `DELETE /documents/{id}` |
| Beleg-Detailansicht mit Vorschau | ✅ | – | SPA `BelegeView` ReviewDrawer, `GET /documents/{id}/file` |
| „Privat bezahlt" (Auslage) markieren | ✅ | Boolean `privatelyPaid`, filterbar | BE `document/domain/Document`, `GET /transactions?privatelyPaid=true` |
| Auslagen-Erstattung (Empfänger, IBAN, Auszahlungsstatus) | ❌ / 💡 | Nur das Flag oben; keine Person/IBAN/Status/Summe pro Person | – |
| Beleg auf mehrere Kategorien/Beträge aufteilen | ❌ | 1 Beleg = 1 Transaktion, 1 Wert pro Kategoriegruppe; Datenmodell-Änderung nötig | BE `transaction_category_value` Unique-Key |
| Upload ohne Konto (Gast, z. B. per Link) | ❌ / 💡 | Alle Beleg-Endpoints erfordern Login | BE `application.properties` (öffentliche Pfade) |
| „Meine Belege"-Ansicht für Einreichende | ❌ | Belege werden organisationsweit gelistet | BE `document/repository/DocumentRepository` |

## 3. Kategorien

| Funktion | Status | Details | Beleg |
|---|---|---|---|
| Kategoriegruppen mit Werten | ✅ | Pro Organisation frei definierbar, Pflichtfeld-Option | BE `/category-groups`, SPA `/admin/categories` |
| Kategorien Bommeln zuordnen (mit Vererbung) | ✅ | Zuordnung vererbt sich auf Unter-Bommel | Migration `V1.0.22__category_groups.sql` |
| Kategorie-Vorlagen (zum Kopieren) | ❌ / 💡 | Nur organisationsweite Gruppen + Vererbung | – |
| Kontenrahmen (SKR49, Kontenplan) | ❌ | Siehe [04-roadmap.md](04-roadmap.md) | – |

## 4. Transaktionen, Bank & Buchhaltung

| Funktion | Status | Details | Beleg |
|---|---|---|---|
| Transaktionen (Einnahmen/Ausgaben) | ✅ | Mit/ohne Beleg, Status `DRAFT`/`CONFIRMED` | BE `transaction/`, SPA `/transactions` |
| Sphären (ideeller Bereich, Zweckbetrieb …) | ✅ | Deutsches Gemeinnützigkeitsrecht | BE `TransactionArea` |
| Bank-Import CSV mit Schema-Editor | ✅ | Delimiter, Encoding, Formate konfigurierbar | BE `bankimport/`, SPA `/bank-accounts`, `/bank-schemas` |
| Bank-Import MT940 | ✅ | – | BE `bankimport/` |
| Abgleich Bank ↔ Belege (inkl. Teilbeträge) | ✅ | Manuell; Auto-Matching erst Gerüst | BE `BankTransactionMatch` |
| Automatischer Kontoabruf (FinTS/EBICS) | ❌ | – | – |
| Doppelte Buchführung / EÜR / Jahresabschluss | ❌ | Siehe [04-roadmap.md](04-roadmap.md) | – |
| Kassenbuch (Bargeld) | ❌ | – | – |

## 5. Budget & Freigaben

| Funktion | Status | Details | Beleg |
|---|---|---|---|
| Budget / Haushaltsplan pro Bommel oder Kategorie | ❌ / 💡 | Kein Budget-Modell; Soll/Ist-Vergleich fehlt | – |
| Freigabe-Workflows (4-Augen, Budget-/Auslagen-Bewilligung) | ❌ | Nur Audit-Felder `uploadedBy`/`reviewedBy` | BE `document/domain/Document` |

## 6. Auswertungen & Export

| Funktion | Status | Details | Beleg |
|---|---|---|---|
| Einnahmen/Ausgaben/Saldo pro Organisation & Bommel (rekursiv) | ✅ | – | BE `statistics/`, `GET /statistics/bommels/{id}` |
| Summen pro Kategorie, filterbar nach Bommel & Zeitraum | ✅ | – | `GET /category-groups/{id}/report`, SPA `/reports` |
| CSV-Export der Kategorie-Auswertung | 🟡 | Clientseitig im Browser, nur Summen | SPA `components/views/ReportsView.tsx` (`exportCsv`) |
| Export Belegliste / Transaktionen (CSV/Excel) | ❌ / 💡 | Keine Export-Endpoints | – |
| Export Belegdateien gesammelt (ZIP) | ❌ / 💡 | Nur Einzeldownload | `GET /documents/{id}/file` |
| DATEV-Export, PDF-Berichte | ❌ | Siehe [04-roadmap.md](04-roadmap.md) | – |

## 7. Benutzer, Rollen & Rechte

| Funktion | Status | Details | Beleg |
|---|---|---|---|
| Mitglieder per E-Mail einladen | ✅ | Einladung auf **Organisations**-Ebene (Keycloak-Mail) | `POST /organization/my/members`, SPA `AddUserDialog.tsx` |
| Mitgliederliste mit Funktion (Freitext) & Status | ✅ | `position` ist Freitext **ohne Rechte** | BE `member/domain/Member.java` |
| Rollen (Admin, Kassier, Prüfer, Leser …) | ❌ | Keycloak-Realm-Rollen existieren, werden aber im Org-Service nicht geprüft → **jedes Mitglied darf alles in seiner Organisation** | BE: nur `@RolesAllowed("admin")` für SaaS-Admin |
| Rechte pro Bommel (z. B. nur eigener Anlass) | ❌ | `checkUserHasPermission()` ist ein TODO | BE `bommel/api/BommelResource.java` |
| Einladung / Direktlink zu einem Bommel | ❌ / 💡 | – | – |
| Mitglied entfernen, Rollen ändern (UI) | ❌ | – | – |
| Eigenes Profil: Sprache, Theme | ✅ | – | SPA `/profile` |
| Eigenes Profil: Name, IBAN/Auszahlungskonto | ❌ | Name ggf. über Keycloak-Account-Konsole ❓ | – |
| SaaS-Administration (alle Organisationen, Impersonation) | ✅ | Nur Betreiber; im Single-Tenant-Modus deaktiviert | `frontend/admin`, BE `AdminOrganizationResource` |

## 8. Login & Identity

| Funktion | Status | Details | Beleg |
|---|---|---|---|
| Login mit E-Mail/Passwort (Keycloak) | ✅ | Eigenes Login-Theme | `frontend/keycloak-theme` |
| Externer Identity-Provider via OIDC (SSO) | ✅ (Self-Hosting) / ❓ (SaaS) | Generischer OIDC-Broker per `.env` konfigurierbar, getestet mit Authentik; Button im Login-Theme | `infrastructure/hopps-app/EXTERNAL-IDP.md`, `hopps-realm.json` |
| Anbindung hitobito/MIDATA | 💡 | Nicht getestet; hitobito bietet OAuth2/OIDC → voraussichtlich Konfiguration. Voraussetzung: `email`-Claim (Principal) | `quarkus.oidc.token.principal-claim=email` |
| Neue SSO-Nutzer automatisch Organisation zuordnen | ❌ | SSO-Nutzer müssen als Mitglied eingeladen sein, sonst „Kein Zugriff" | BE `shared/tenancy` |

## 9. Sprachen, Währungen, Regionales

| Funktion | Status | Details | Beleg |
|---|---|---|---|
| Deutsch, Englisch | ✅ | Web-App, Login, Admin | SPA `locales/de.json`, `en.json` |
| Ukrainisch | 🟡 | ca. ⅓ übersetzt | SPA `locales/uk.json` |
| Französisch, Italienisch | ❌ / 💡 | Reine Übersetzungsarbeit (~1.260 Keys) + Realm-Locales; Keycloak bringt fr/it-Standardtexte mit | – |
| Währungsfeld an Beleg/Transaktion | 🟡 | `currencyCode` wird gespeichert (KI-Extraktion) | BE `Document`, `Transaction` |
| Andere Währung als EUR (z. B. CHF) in der Oberfläche | ❌ / 💡 | UI formatiert fest mit `EUR`/`de-DE`; Bankkonto-Default EUR; keine Umrechnung, Summen ignorieren Währung | SPA `BelegeView.tsx`, `TransactionenView.tsx`, `ReportsView.tsx` … |
| Länderspezifika ausserhalb DE (Rechtsformen, Steuer, Kontenplan) | ❌ | Fachlich auf Deutschland ausgerichtet | – |

## 10. Mobile

| Funktion | Status | Details | Beleg |
|---|---|---|---|
| Web-App auf dem Smartphone | 🟡 | Mobile Navigation vorhanden; Upload über Browser inkl. Kamera-Dateiauswahl des Geräts; nicht durchgängig mobil optimiert ❓ | SPA `sidebar-navigation/mobile-sidebar.tsx` |
| Native App (iOS/Android) | 🔜 | Expo-App mit Kamera/Galerie/PDF-Auswahl & Keycloak-Login existiert, **Belege laufen aber noch über Mock-Daten** (nicht ans Backend angebunden), nicht in App-Stores ❓ | `frontend/mobile`, `contexts/DocumentContext.tsx` |
| Offline-Erfassung | ❌ | – | – |

## 11. Aufbewahrung, Nachvollziehbarkeit, Sicherheit

| Funktion | Status | Details | Beleg |
|---|---|---|---|
| Aufbewahrung 10 Jahre / Löschschutz | ❌ | Hartes Löschen, kein Soft-Delete, kein S3-Object-Lock | `DocumentResource.deleteDocument` |
| GoBD-Festschreibung / Änderungshistorie | ❌ | Nur Audit-Felder (`uploadedBy`, `reviewedBy`) | – |
| Mandantentrennung | ✅ | Jede Anfrage auf Organisation des Mitglieds beschränkt | BE `shared/security`, `OrganizationContext` |
| Datenhaltung & Sub-Dienstleister | → | Siehe [03-technik-hosting-datenschutz.md](03-technik-hosting-datenschutz.md) | – |

---

## Die grossen Querschnitts-Lücken

Viele Einzelanforderungen hängen an wenigen fehlenden Grundbausteinen. Bei Antworten darauf verweisen:

1. **Rollen & Rechte** (Organisation + pro Bommel) → betrifft Kassier-Rollen, Einladungen pro Anlass, Bearbeiten/Löschen nur durch Berechtigte, Freigaben.
2. **Bommel als Anlass** (Beschreibung, Zeitraum, Status offen/abgeschlossen) → Anlässe/Lager, Abschluss, Aufbewahrung.
3. **Auslagen-/Erstattungsmodell** (Empfänger:in, IBAN, Status, Gast-Einreichung) → Spesen, Auszahlungslisten, Status für Einreichende.
4. **Öffentlicher Upload-Link pro Bommel** (Token) → Einreichen ohne Konto.
5. **Exporte** (Belegliste + ZIP, DATEV) und **Budget/Soll-Ist**.
