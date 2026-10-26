# Testdaten: Fehler beim Beleg-Upload

Dateien, mit denen sich die Fehlerzustände des Upload-Bereichs auf der Belegseite (`/receipts`) gezielt auslösen
lassen. Die großen Dateien liegen nicht im Repo und werden lokal erzeugt:

```bash
cd demo-data/upload-fehler
python build_fehlerdateien.py
```

## Dateien

| Datei | Erwartetes Verhalten | Wo geprüft |
|-------|----------------------|------------|
| `dateien/zu-gross-12mb.pdf` *(generiert)* | Fehlerzeile „Zu groß (max. 10 MB)" | Browser, vor dem Upload |
| `dateien/genau-10mb.pdf` *(generiert)* | Fehlerzeile „Zu groß (max. 10 MB)". Der Browser lässt die Datei durch, das Backend lehnt den Request mit **413** ab | Backend (`max-body-size=10M`) |
| `dateien/falscher-typ.docx` | Fehlerzeile „Dateityp nicht unterstützt" | Browser, vor dem Upload |
| `dateien/falscher-typ.txt` | Fehlerzeile „Dateityp nicht unterstützt" | Browser, vor dem Upload |
| `dateien/duplikat-getraenke-huber.pdf` | Zeile „Datei bereits vorhanden" mit Link „Beleg anzeigen", verschwindet nach 3 s. Voraussetzung: `sommerfest/belege/beleg-A-getraenke-huber.pdf` ist schon hochgeladen (oder diese Datei zweimal hochladen) | Backend (**409**) |
| `dateien/kaputt-kein-pdf.pdf` | Upload klappt, die Analyse scheitert. Der Beleg erscheint in der Tabelle als „Manuell ausfüllen" | Analyse, nach dem Upload |
| `dateien/ok-kleiner-beleg.pdf` | Erfolgreicher Upload, für gemischte Uploads | kein Fehler |

## Szenarien

- **Gemischter Upload:** alle Dateien aus `dateien/` auf einmal auswählen. Während des Uploads sind Dropzone und
  „Automatisch analysieren" ausgeblendet. Danach erscheint die kompakte Dropzone; erfolgreiche Zeilen und das
  Duplikat verschwinden nach 3 s, die Fehlerzeilen bleiben bis „Entfernen" / „Alle entfernen".
- **Nur Erfolge:** `ok-kleiner-beleg.pdf` hochladen (vorher ggf. löschen, sonst Duplikat). Die Zeile verschwindet nach
  3 s, der Upload-Bereich kehrt in den Ruhezustand zurück.
- **Nachlegen während des Uploads:** `genau-10mb.pdf` hochladen und, solange es lädt, eine weitere Datei auf die Karte
  ziehen. Sie wird an den laufenden Upload angehängt.

## Fehler ohne Testdatei

Diese Fälle hängen nicht an der Datei, sondern an Verbindung oder Server:

| Fehlerzeile | So auslösen |
|-------------|-------------|
| „Keine Verbindung zum Server" | DevTools → Network → **Offline**, dann hochladen |
| „Serverfehler, bitte später erneut versuchen" | Storage nicht erreichbar machen, z. B. MinIO/LocalStack-Container stoppen, dann hochladen |
| „Sitzung abgelaufen, bitte neu anmelden" | In Keycloak die Sitzung beenden (Admin-Konsole → Sessions → Sign out), dann ohne Neuladen hochladen |
