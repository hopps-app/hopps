# Mitwirken an Hopps

Danke für das Interesse an Hopps! Beiträge sind willkommen, egal ob Bugfix, neues Feature,
Übersetzung oder Verbesserung der Dokumentation. Dieses Dokument beschreibt, wie ein Beitrag
vom ersten Gedanken bis zum Merge in `main` kommt.

## Überblick

```
Issue anlegen → Fork → Branch (mit Issue verknüpft) → Commits → Pull Request → grüner Build + Review → Merge
```

1. **Issue** anlegen (oder ein bestehendes übernehmen)
2. Repository **forken**
3. **Branch** im Fork anlegen und mit dem Issue verknüpfen
4. Änderungen umsetzen, lokal testen
5. **Pull Request** gegen `hopps-app/hopps:main` öffnen
6. **Merge** erst, wenn alle Checks grün sind und ein Review vorliegt

## 1. Zuerst ein Issue

Vor größeren Änderungen bitte zuerst ein [Issue](https://github.com/hopps-app/hopps/issues) anlegen.
So lässt sich vorab klären, ob die Änderung ins Projekt passt und wie sie am besten umgesetzt wird,
bevor Zeit in Code fließt, der später nicht gemergt werden kann.

- **Bug:** Was passiert, was wird erwartet, Schritte zum Reproduzieren, ggf. Screenshots/Logs.
- **Feature:** Welches Problem soll gelöst werden, für wen, und ggf. ein Lösungsvorschlag.
- Wer an einem Issue arbeiten möchte, schreibt kurz einen Kommentar, damit keine doppelte Arbeit entsteht.

Kleinigkeiten (Tippfehler, offensichtliche Einzeiler) dürfen auch direkt als Pull Request kommen.

> **Sicherheitslücken** bitte **nicht** als öffentliches Issue melden, sondern vertraulich an das
> Maintainer-Team (z. B. über [GitHub Security Advisories](https://github.com/hopps-app/hopps/security/advisories/new)).

## 2. Repository forken

Direkte Pushes auf `hopps-app/hopps` sind nicht vorgesehen; gearbeitet wird in einem eigenen Fork.

```bash
# Fork auf GitHub über den "Fork"-Button anlegen, dann:
git clone git@github.com:<github-user>/hopps.git
cd hopps
git remote add upstream git@github.com:hopps-app/hopps.git
```

Oder mit der GitHub CLI in einem Schritt:

```bash
gh repo fork hopps-app/hopps --clone
```

Vor jedem neuen Branch den Fork auf den aktuellen Stand bringen:

```bash
git fetch upstream
git switch main
git merge --ff-only upstream/main
git push origin main
```

## 3. Branch anlegen und mit dem Issue verknüpfen

Für jede Änderung einen eigenen Branch anlegen und nie direkt auf `main` im Fork arbeiten.
Der Branch-Name beginnt mit der Issue-Nummer, z. B. `123-beleg-export-als-csv`.

**Empfohlen: Branch direkt aus dem Issue erzeugen**, dann ist die Verknüpfung automatisch gesetzt:

- **Im Browser:** im Issue rechts unter **Development** → **Create a branch** → bei
  *Repository destination* den eigenen Fork auswählen → danach lokal `git fetch origin` und den Branch auschecken.
- **Mit der GitHub CLI:**
  ```bash
  gh issue develop 123 --repo hopps-app/hopps --branch-repo <github-user>/hopps --checkout
  ```

**Alternativ manuell:**

```bash
git switch -c 123-beleg-export-als-csv upstream/main
```

In diesem Fall wird das Issue spätestens über die PR-Beschreibung verknüpft (siehe unten).

## 4. Änderungen umsetzen

Die technischen Konventionen (Architektur, Code-Organisation, API-Client-Workflow, i18n) stehen
in der [README](README.md), den READMEs der einzelnen Services und in
[`.claude/CLAUDE.md`](.claude/CLAUDE.md). Die wichtigsten Punkte:

- **Backend (Quarkus/Java 21):** Vertical-Slice-Struktur einhalten, DTOs als Records,
  jede DB-Änderung als Flyway-Migration, Endpoints vollständig mit OpenAPI-Annotationen dokumentieren.
- **Frontend (React/TypeScript):** Backend-Aufrufe ausschließlich über `@hopps/api-client`;
  nach API-Änderungen den Client neu generieren und bauen.
- **Texte:** Keine hart kodierten UI-Texte, alles über i18next, mindestens Deutsch **und** Englisch
  (`frontend/spa/src/locales/`). Deutsch neutral formulieren (kein „Sie“/„du“), Englisch in US-Schreibweise.
- **Tests:** Neue Funktionen und Bugfixes mit Tests absichern.
- **Wissensdatenbank:** Bei Feature-Änderungen die betroffene Zeile in
  [`docs/wissensdatenbank/02-funktionsumfang.md`](docs/wissensdatenbank/02-funktionsumfang.md) mitpflegen.

Vor dem Pushen lokal prüfen:

```bash
# Backend (im jeweiligen Service-Verzeichnis, z. B. backend/app.hopps.org)
./mvnw verify

# Frontend
cd frontend/spa
pnpm install
pnpm run validate   # Lint + Tests
```

## 5. Pull Request öffnen

```bash
git push -u origin 123-beleg-export-als-csv
gh pr create --repo hopps-app/hopps --base main
```

### PR-Titel: Conventional Commits

PRs werden per **Squash-Merge** übernommen, der PR-Titel wird dabei zur Commit-Message. Aus diesen
Titeln erzeugt release-please Versionsnummer und Changelog. Deshalb muss der Titel dem Format
[Conventional Commits](https://www.conventionalcommits.org/de/) folgen. Der Check `pr-title` prüft das automatisch.

| Typ | Wann | Auswirkung auf die Version |
|---|---|---|
| `feat(scope): …` | neues Feature | Minor |
| `fix(scope): …` | Bugfix | Patch |
| `docs`, `refactor`, `test`, `ci`, `build`, `chore`, `perf`, `style` | alles andere | kein Release |
| `feat!: …` bzw. `BREAKING CHANGE:` im Body | inkompatible Änderung (z. B. Konfiguration/Env-Vars) | Major |

Beispiele: `feat(receipts): export receipts as CSV`, `fix(bankimport): handle empty CSV lines`.

### PR-Beschreibung

- **Issue verknüpfen** mit einem Schlüsselwort, z. B. `Closes #123` oder `Fixes #123`.
  Dann wird das Issue beim Merge automatisch geschlossen.
- Kurz beschreiben, **was** geändert wurde und **warum**.
- Bei UI-Änderungen Screenshots anhängen.
- Hinweise für Betreiber (neue Env-Vars, Migrationen, geänderte Konfiguration) explizit nennen.
- Noch nicht fertig? Als **Draft Pull Request** öffnen.

Die Option **„Allow edits by maintainers“** bitte aktiviert lassen, damit Maintainer bei Bedarf
kleine Korrekturen direkt im Branch vornehmen können.

## 6. Review und Merge

Ein Pull Request kann **nur gemergt werden, wenn der Build grün ist**:

- Alle erforderlichen CI-Checks (Backend, Frontend, PR-Titel …) müssen erfolgreich durchlaufen.
- Mindestens ein Review durch ein Mitglied des Maintainer-Teams muss vorliegen.
- Der Branch muss auf dem aktuellen Stand von `main` sein.

Schlägt ein Check fehl, die Logs im Tab **Checks** ansehen, den Fehler im eigenen Branch beheben
und erneut pushen. Der PR aktualisiert sich automatisch. Bei Merge-Konflikten den Branch auf
`upstream/main` aktualisieren:

```bash
git fetch upstream
git rebase upstream/main
git push --force-with-lease
```

> Bei Pull Requests aus Forks müssen Workflows beim ersten Beitrag ggf. von einem Maintainer
> freigegeben werden. Secrets (z. B. für Image-Pushes) stehen in Fork-PRs nicht zur Verfügung;
> die entsprechenden Schritte werden dort übersprungen.

Gemergt wird durch das Maintainer-Team per Squash-Merge. Danach kann der Branch im Fork gelöscht werden.

## Fragen?

Bei Unklarheiten einfach im jeweiligen Issue nachfragen oder ein neues Issue mit der Frage anlegen.

## Lizenz

Mit dem Einreichen eines Beitrags erklärt sich die beitragende Person damit einverstanden, dass der
Beitrag unter der [MIT-Lizenz](LICENSE) des Projekts veröffentlicht wird.
