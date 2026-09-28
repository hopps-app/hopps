# Produkt & Organisation

_Stand: 2026-09-17_

## Was ist Hopps?

Hopps ist eine **cloudbasierte Open-Source-Software für die Finanzverwaltung gemeinnütziger
Organisationen (Vereine, Verbände, Jugendorganisationen)** mit KI-Unterstützung. Ziel: Ehrenamtliche
sparen Zeit bei Belegen, Kassenführung und Auswertungen.

Aktueller Schwerpunkt (siehe [02-funktionsumfang.md](02-funktionsumfang.md)):
- Belegerfassung mit KI-Auslesung (OCR, ZUGFeRD/E-Rechnung)
- Abbildung der Vereinsstruktur als Baum (Abteilungen, Gruppen, Projekte, Anlässe) = **„Bommel"**
- Kategorien, Transaktionen, Auswertungen pro Organisationseinheit
- Bank-Import (CSV/MT940) und Abgleich mit Belegen

Hopps ist heute **noch keine vollständige Buchhaltung** (kein Kontenrahmen, keine doppelte
Buchführung, kein Jahresabschluss) – siehe [04-roadmap.md](04-roadmap.md).

## Träger & Förderung

| Punkt | Fakt |
|---|---|
| Entwickelt von | **Open Project e.V.**, Pfaffenhofen a. d. Ilm (Deutschland), ehrenamtliches Entwickler:innen-Team |
| Gefördert von | Deutsche Stiftung für Engagement und Ehrenamt (DSEE) |
| Kontakt | info@hopps.app |
| Website / App | https://hopps.app (Info) · https://hopps.cloud (App) |
| Quellcode | https://github.com/hopps-app/hopps |
| Lizenz | **MIT** – freie Nutzung, Anpassung und Self-Hosting erlaubt |

## Betriebsmodelle

| Modell | Beschreibung | Status |
|---|---|---|
| **SaaS (hopps.cloud)** | Gehostet vom Open Project e.V., mehrere Organisationen (Multi-Tenant) | ✅ |
| **Self-Hosting** | Eigene Installation via Docker Compose oder Helm-Chart (Kubernetes); Single-Tenant-Modus (`HOPPS_TENANCY_MODE=single`) für genau eine Organisation mit Ersteinrichtung | 🔜 in Umsetzung (Branch `feat/single-tenant-mode`, Stand 2026-09-17) – Docker/Helm selbst ✅ |

## Zielgruppe

Gemeinnützige Organisationen mit überwiegend ehrenamtlicher Kassenführung – vom kleinen Verein bis
zum Verband mit vielen Untergliederungen (Bommel-Baum). Fachlich aktuell auf **deutsche**
Vereinsanforderungen ausgerichtet; für andere Länder (z. B. Schweiz, Österreich) siehe
Währungen/Sprachen in [02-funktionsumfang.md](02-funktionsumfang.md).

## Kosten / Preismodell

❓ **Offen** – es ist kein öffentliches Preismodell dokumentiert. Vor Aussagen zu Kosten,
Pilotkonditionen oder Support-Verträgen immer beim Team nachfragen.

## Mitgestaltung

Als Open-Source-Projekt ist Hopps offen für Pilotorganisationen, die Anforderungen einbringen,
testen und ggf. Entwicklung (mit-)finanzieren. ❓ Konkrete Kooperationsmodelle (Pilot, Sponsoring,
Auftragsentwicklung) sind nicht festgelegt → Team fragen.
