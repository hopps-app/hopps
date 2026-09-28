# Roadmap & Ausbaurichtung

_Stand: 2026-09-17_

> **Keine verbindlichen Zusagen.** Reihenfolge und Zeitpunkt hängen von Kapazität (ehrenamtliches
> Team), Förderung und Pilotorganisationen ab. Gegenüber Kund:innen nur „in Planung" / „angedacht",
> nie Termine.

Ausführliche Analyse: [`FEATURE_GAP_ANALYSE_VEREINSBUCHHALTUNG.md`](../../FEATURE_GAP_ANALYSE_VEREINSBUCHHALTUNG.md).

## In Umsetzung (🔜)

| Thema | Stand |
|---|---|
| Self-Hosting Single-Tenant-Modus | Branch `feat/single-tenant-mode` |
| Rechtstexte (DSE, Impressum, AVV) | Entwürfe 09/2026 |
| Native Mobile-App | Prototyp mit Mock-Daten, Backend-Anbindung ausstehend |

## Geplant / empfohlene Reihenfolge (aus Gap-Analyse)

1. **Buchhaltungs-Fundament:** Kontenrahmen (SKR49), EÜR, Geschäftsjahr, GoBD-Festschreibung
2. **Vereins-Spezifika:** Spendenbescheinigungen, Mitglieder-/Beitragsverwaltung, SEPA-Lastschrift
3. **Auswertungen & DATEV-Export**, Sphären-Auswertungen, Kassenbericht, Budget Soll/Ist
4. **Ausgangsrechnungen, E-Rechnung, Mahnwesen**
5. USt/ELSTER, Kassenbuch, FinTS, Fördermittelnachweise, Anlagenbuchhaltung
6. Querschnitt: **Rollen & Rechte (inkl. 4-Augen-Freigabe)**, Steuerberater-Zugang, Fremdwährungen

## Aus Kundenanfragen gesammelte Wünsche (anonymisiert)

Neue, noch nicht oben enthaltene Wünsche hier ergänzen – mit Häufigkeit, um Priorisierung zu stützen.

| Wunsch | Anzahl Anfragen | Querschnitts-Baustein (siehe `02`) |
|---|---|---|
| Rollen pro Anlass/Gruppe (z. B. Anlass-Kassier) | 1 | Rollen & Rechte |
| Anlässe mit Zeitraum, abschliessen/archivieren | 1 | Bommel als Anlass |
| Auslagen/Spesen mit Auszahlungskonto & Auszahlungsliste | 1 | Auslagenmodell |
| Beleg-Upload ohne Konto per Anlass-Link | 1 | Öffentlicher Upload-Link |
| Login über Verbands-IdP (hitobito/MIDATA) | 1 | Login & Identity |
| Französisch / Italienisch | 1 | Sprachen |
| CHF als Währung | 1 | Währungen |
| Budget pro Anlass + Freigabe | 1 | Budget & Freigaben |
| Beleg auf mehrere Kategorien splitten | 1 | Belege |
| Export pro Anlass (Belege, Auszahlungen) | 1 | Exporte |
| 10 Jahre Aufbewahrung nach Abschluss | 1 | Aufbewahrung |
