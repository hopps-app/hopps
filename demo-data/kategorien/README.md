# Testdaten: Kategorien

Export-Dateien für den Import von Kategoriegruppen unter `/admin/categories` (Button „Importieren“ bzw. Option „Aus Datei
importieren“ bei der Ersteinrichtung). Beide Dateien tragen denselben `sourceKey`, gehören also zur selben Vorgabe.

## Dateien

| Datei | Inhalt | Erwartetes Verhalten |
|-------|--------|----------------------|
| `kategorien_demo_v1.json` | Gruppe „Kostenart“, optional, 12 Kategorien auf zwei Ebenen | Legt die Gruppe an. Vorher muss mindestens ein Bommel gewählt werden |
| `kategorien_demo_v2.json` | Dieselbe Vorgabe, geänderte Einstellungen, 16 Kategorien | Nach v1: ergänzt nur die 4 neuen Kategorien. Ohne v1: legt die Gruppe wie in der Datei an |

## Abgedeckte Fälle in v1

- **Sammlung:** „Personal“ ist nicht direkt buchbar, nur seine Unterkategorien.
- **Direkt buchbare Oberkategorie:** „Technik“ ist selbst buchbar und hat Unterkategorien.
- **Ausgeblendete Unterkategorie:** „Mietgeräte“.
- **Ausgeblendete Oberkategorie:** „Öffentlichkeitsarbeit“ blendet „Plakate“ und „Social Media“ mit aus.
- **Kategorie ohne Unterkategorien:** „Sonstiges“.

## Szenario: erneuter Import

1. `kategorien_demo_v1.json` importieren und einen Bommel wählen. Die Gruppe „Kostenart“ entsteht mit 12 Kategorien.
2. `kategorien_demo_v2.json` importieren. Der Dialog meldet, dass die Vorgabe schon existiert, und fragt nicht nach Bommeln.
3. Neu sind „Honorare Schauspiel“, „Reisekosten“, „Fahrtkosten“ und „Übernachtung“.
4. Alles Vorhandene bleibt unverändert: Name, Pflichtfeld sowie die Einstellungen von „Technik“ und „Licht“ aus v2 werden
   nicht übernommen.
