# FAQ – wiederkehrende Fragen

_Stand: 2026-09-17_

Kurzantworten zum Übernehmen. Details und Belege in den verlinkten Dateien. ❓ = vor Versand klären.

### Allgemein

**Ist Hopps Open Source?**
Ja, MIT-Lizenz. Code auf https://github.com/hopps-app/hopps – Nutzung, Anpassung und Self-Hosting sind frei. → [01](01-produkt-und-organisation.md)

**Wer steht dahinter?**
Der Open Project e.V. (Pfaffenhofen a. d. Ilm, DE) mit einem ehrenamtlichen Entwicklungsteam, gefördert von der Deutschen Stiftung für Engagement und Ehrenamt. → [01](01-produkt-und-organisation.md)

**Was kostet Hopps?**
❓ Kein öffentliches Preismodell – Team fragen.

**Ist Hopps eine vollständige Buchhaltung?**
Noch nicht. Stärken sind Belegerfassung mit KI, Vereinsstruktur, Kategorien, Auswertungen und Bank-Abgleich. Kontenrahmen, doppelte Buchführung und Jahresabschluss sind in Planung. → [02](02-funktionsumfang.md), [04](04-roadmap.md)

### Daten & Datenschutz

**Wo liegen die Daten?**
SaaS: Anwendung und Datenbank bei Hetzner in Deutschland, Belegdateien bei DigitalOcean in Frankfurt (EU). KI-Auslesung über Azure in der EU (Document Intelligence und Azure OpenAI in West Europe; LLM als `DataZoneStandard`, bleibt in der EU-Datenzone) – abschaltbar, keine Übermittlung in die USA. Alternativ Self-Hosting auf eigener Infrastruktur. → [03](03-technik-hosting-datenschutz.md)

**Können wir Hopps selbst betreiben (z. B. in der Schweiz)?**
Ja, per Docker Compose oder Helm-Chart. Single-Tenant-Modus für eine Organisation ist in Umsetzung. → [03](03-technik-hosting-datenschutz.md)

**Gibt es einen Auftragsverarbeitungsvertrag?**
In Vorbereitung (Entwurf 09/2026). ❓ Verfügbarkeit vor Zusage prüfen.

**Werden Belege 10 Jahre aufbewahrt?**
Heute gibt es noch keinen Löschschutz bzw. keine Aufbewahrungslogik; umgesetzt werden soll das mit der GoBD-Festschreibung. → [03](03-technik-hosting-datenschutz.md)

### Nutzung

**Gibt es eine App?**
Die Web-App ist auf dem Smartphone nutzbar (Fotoupload über den Browser). Eine native App ist als Prototyp vorhanden, aber noch nicht produktiv. → [02 §10](02-funktionsumfang.md)

**Können wir unseren bestehenden Login (SSO) nutzen?**
Hopps nutzt Keycloak und kann externe Identity-Provider per OIDC einbinden (für Self-Hosting dokumentiert). Spezifische Anbieter (z. B. hitobito/MIDATA) sind noch nicht getestet, voraussichtlich aber reine Konfiguration. → [02 §8](02-funktionsumfang.md)

**Welche Sprachen gibt es?**
Deutsch und Englisch vollständig, Ukrainisch teilweise. Weitere Sprachen sind reine Übersetzungsarbeit – Community-Beiträge willkommen. → [02 §9](02-funktionsumfang.md)

**Unterstützt Hopps andere Währungen als EUR?**
Die Währung wird am Beleg gespeichert, die Oberfläche rechnet und formatiert aber aktuell in EUR. Eine Organisations-Währung (z. B. CHF) ist mit überschaubarem Aufwand umsetzbar. → [02 §9](02-funktionsumfang.md)

**Kann man Rechte auf einzelne Abteilungen/Anlässe beschränken?**
Heute nicht – alle Mitglieder einer Organisation haben die gleichen Rechte. Ein Rollen- und Rechtemodell pro Organisationseinheit ist der wichtigste geplante Querschnittsbaustein. → [02 §7](02-funktionsumfang.md)

**Gibt es einen DATEV-Export?**
Noch nicht; geplant. Heute: CSV-Export der Kategorie-Auswertung und Download einzelner Belege. → [02 §6](02-funktionsumfang.md)
