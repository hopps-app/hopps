# Technik, Hosting & Datenschutz

_Stand: 2026-09-17_

## Architektur (Kurzfassung)

| Komponente | Technik |
|---|---|
| Web-App | React (SPA), mehrsprachig via i18next |
| Backend | Java 21 / Quarkus Microservices: `org` (Kern), `az-document-ai` (KI-Auslesung), `zugferd` (E-Rechnung) |
| Datenbank | PostgreSQL 16 |
| Dateien (Belege) | S3-kompatibler Object Storage (SaaS: DigitalOcean Spaces; Self-Hosting: MinIO o. ä.) |
| Login / Identity | Keycloak (OAuth2/OIDC), eigenes Login-Theme, externer IdP per OIDC anbindbar |
| KI | Azure AI Document Intelligence (OCR) + Azure OpenAI `gpt-4o-mini` (Extraktion) via LangChain4j |
| Betrieb | Docker-Images (ghcr.io), Docker Compose, Helm-Chart (Kubernetes), GitOps (Flux) |
| Qualität | CI via GitHub Actions, SonarCloud, Dependency-Track, Contract-Tests (Pact) |

Details: [`.claude/CLAUDE.md`](../../.claude/CLAUDE.md), [`infrastructure/hopps-app/README.md`](../../infrastructure/hopps-app/README.md).

## Hosting der SaaS-Instanz hopps.cloud

| Datenkategorie | Anbieter | Ort | Hinweis |
|---|---|---|---|
| Anwendung, Datenbank, Keycloak | Hetzner | **Deutschland** | Kubernetes-Cluster |
| Belegdateien, CSV-Importe, Logos | DigitalOcean Spaces | **Frankfurt (fra1), EU** | US-Unternehmen → DPA + SCC |
| KI-Auslesung (OCR) | Microsoft Azure AI Document Intelligence | **West Europe (EU)** | US-Konzern → DPA + SCC |
| KI-Extraktion (LLM) | Microsoft Azure OpenAI | **West Europe (EU)** | Eigene Azure-Ressource, Deployment-Typ `DataZoneStandard` → Speicherung und Inferenz bleiben in der EU-Datenzone; US-Konzern → DPA + SCC, keine Übermittlung an OpenAI/USA (Stand 2026-09-28) |
| System-E-Mails (Einladungen, Passwort) | ALL-INKL.COM | Deutschland | – |

**KI abschaltbar:** Automatische Analyse pro Organisation deaktivierbar – dann verlassen Belege die
Hetzner/DigitalOcean-Infrastruktur nicht Richtung Azure.

## Self-Hosting

- Vollständiger Stack per **Docker Compose** auf einem Server (`infrastructure/hopps-app/docker-compose.yaml`)
  oder per **Helm-Chart** (`charts/hopps`) – z. B. in der Schweiz oder auf eigener Infrastruktur.
- **Single-Tenant-Modus** (`HOPPS_TENANCY_MODE=single`): eine Organisation, Ersteinrichtung,
  danach nur Zugang per Einladung – 🔜 Branch `feat/single-tenant-mode` (Stand 2026-09-17).
- Für KI-Auslesung sind **eigene** Azure-Zugänge nötig (Document Intelligence + Azure OpenAI); ohne KI nutzbar
  (Analyse deaktivieren). ❓ `az-document-ai` startet derzeit nicht ohne Azure-Credentials.
- Externer Identity-Provider (OIDC) per `.env`: `infrastructure/hopps-app/EXTERNAL-IDP.md`.
- Lizenz MIT → keine Lizenzkosten.

## Datenschutz (DSGVO / Schweizer nDSG)

| Punkt | Stand |
|---|---|
| Rollen | Hopps (Open Project e.V.) = **Auftragsverarbeiter** für Vereinsdaten (Belege, Bank, Mitglieder); Verein = Verantwortlicher. Für Nutzerkonten/Website ist Hopps selbst Verantwortlicher. |
| AVV / DPA für Kund:innen | 🔜 Entwurf in Arbeit (Stand 09/2026, vor Einsatz juristisch prüfen) |
| Datenschutzerklärung / Impressum | 🔜 Entwürfe auf hopps.app (Stand 09/2026) |
| Sub-Auftragsverarbeiter | Siehe Tabelle oben |
| Datenschutzbeauftragte:r | ❓ noch nicht benannt |
| Schweiz (nDSG) | Deutschland/EU gilt aus Schweizer Sicht als Land mit angemessenem Datenschutz; alle KI-Verarbeitung läuft in DE/EU. Verbleibende US-Konzernbindung (Microsoft, DigitalOcean) → DPA + SCC, Abklärung ❓ bzw. KI deaktivieren oder Self-Hosting |
| Verschlüsselung | TLS für alle Verbindungen ✅; Verschlüsselung at rest ❓ (anbieterseitig prüfen) |
| Backups | ❓ Backup-Konzept der SaaS-Instanz dokumentieren |
| Zertifizierungen (ISO 27001 o. ä.) | ❌ keine eigenen; Rechenzentren der Anbieter zertifiziert ❓ |

## Aufbewahrung & Revisionssicherheit

- Gesetzliche Fristen: **DE** 10 Jahre für Buchungsbelege (§147 AO, GoBD); **CH** 10 Jahre (OR Art. 958f).
- **Heute ❌:** Belege können hart gelöscht werden; keine Festschreibung, kein Löschschutz,
  keine Aufbewahrungsfristen. Organisationen haben lediglich ein Soft-Delete-Datum.
- Empfehlung in Antworten: Export/Archiv ausserhalb von Hopps bis zur Umsetzung; Umsetzung
  (Soft-Delete + Sperre nach Abschluss + Object-Lock) ist auf der Roadmap (GoBD-Block).

## Verfügbarkeit & Support

❓ Keine SLA, keine Support-Zeiten dokumentiert (ehrenamtliches Projekt). Vor Zusagen Team fragen.
