# PRD: Rollen und Rechte

Stand: 24.11.2026 · Status: Entwurf

## Problem

Heute prüft hopps nur bei der Mitgliederverwaltung, wer etwas darf. Jedes eingeladene Mitglied kann die gesamte Buchhaltung sehen und bearbeiten. Im Verein haben aber nicht alle dieselbe Aufgabe:

- Die **Kasse** führt die Bücher.
- Der **Vorstand** verantwortet den Verein und verwaltet Mitglieder und Rollen.
- Weitere Mitglieder wollen die Finanzen nur **lesen**.
- Die Grundlagen (Kategorien, Vereinsdaten) soll nur die Person pflegen, die den Verein angelegt hat.

## Ziele

- Jedes Mitglied kann nur das tun, was seine Rolle erlaubt, auch wenn es die Oberfläche umgeht.
- Vereine können Vorstand und lesende Mitglieder einladen, ohne ihnen unnötige Schreibrechte zu geben.
- Ein Verein kann mehrere Besitzer haben, zum Beispiel bei einem Wechsel im Vorstand oder wenn mehrere Personen den Verein gegründet haben. Er hat immer mindestens einen.
- Neue Rechte (zum Beispiel pro Bereich der Oberfläche) lassen sich später ergänzen, ohne bestehende Prüfungen anzufassen.

## Rollen

| Rolle | Technisch | Für | Darf |
|---|---|---|---|
| Besitzer | `OWNER` | Person, die den Verein angelegt hat, und weitere von ihr ernannte Personen | alles, dazu Vereinsdaten und Kategorien pflegen, Rollen vergeben, weitere Besitzer ernennen |
| Vorstand | `ADMIN` | Vorsitzende, weitere Vorstandsmitglieder | Buchhaltung sehen und bearbeiten, Mitglieder einladen, korrigieren und entfernen, Rollen vergeben (außer die des Besitzers) |
| Kassier:in | `TREASURER` | Kassenwart:in, Schatzmeister:in | Buchhaltung sehen, bearbeiten und bestätigen |
| Leser | `VIEWER` | weitere Mitglieder | alles sehen, nichts ändern |

Es gibt ein oder mehrere Besitzer pro Verein, nie null. Die Rolle gilt pro Verein: Dieselbe Person kann in zwei Vereinen unterschiedliche Rollen haben.

Die Rolle **Kassenprüfer** (`AUDITOR`, nur lesend) ist im System vorhanden, aber ausgeblendet: Sie lässt sich nicht vergeben und taucht in der Auswahl nicht auf. Wer sie bereits hat, behält sie. Das Prüfen und Festschreiben von Buchungen ist zurückgestellt.

## Rechte

| Recht | Besitzer | Vorstand | Kassier:in | Leser |
|---|---|---|---|---|
| Buchhaltung sehen | ja | ja | ja | ja |
| Buchhaltung bearbeiten | ja | ja | ja | nein |
| Kategorien pflegen | ja | nein | nein | nein |
| Vereinsdaten pflegen | ja | nein | nein | nein |
| Mitglieder einladen, korrigieren, entfernen | ja | ja | nein | nein |
| Rollen vergeben | ja | ja (nicht die des Besitzers) | nein | nein |
| Besitzer ernennen, zurückstufen, entfernen | ja | nein | nein | nein |

## Bestehende Vereine

Es sind noch keine Rollen vergeben worden: Alle bisher eingeladenen Mitglieder haben die Standardrolle `ADMIN`. Die Rolle wird deshalb nicht umgeschrieben, sondern nur neu benannt:

| Bisher | Danach | Wirkung |
|---|---|---|
| Gründer:in (`OWNER`) | Besitzer | unverändert, dazu Kategorien pflegen und weitere Besitzer ernennen |
| `ADMIN` (bisher Kasse) | Vorstand (`ADMIN`) | Buchhaltung wie bisher, dazu Mitglieder und Rollen verwalten. Kategorien können nicht mehr geändert werden |
| `BOARD` | Leser (`VIEWER`) | nur lesend wie bisher (Sicherheitsnetz, falls ein Verein die Rolle schon vergeben hat) |
| Kassenprüfung (`AUDITOR`) | unverändert, ausgeblendet | nur lesend |

- Neu ist die Rolle Kassier:in (`TREASURER`). Sie ist die Standardrolle für neue Einladungen.
- Der Besitzer sieht nach dem Update weiterhin einmalig in der Mitgliederliste den Hinweis auf die Rollen.
- Bisher eingeladene Mitglieder können nach dem Update Mitglieder und Rollen verwalten. Wer nur die Buchhaltung führen soll, muss vom Besitzer auf **Kassier:in** umgestellt werden. Das gehört in die Upgrade-Hinweise für Betreiber.

## Offene Fragen

- **Stornobuchung und Festschreiben:** Das Prüfen und Festschreiben von Buchungen durch die Kassenprüfung ist zurückgestellt (Issue #960). Ohne Stornobuchung lässt sich ein Fehler in einer geprüften Buchung nicht mehr korrigieren. Das muss vor dem Release des Prüfens geklärt sein.
## Umsetzung

Übersicht: #957

| Issue | Inhalt | Baut auf |
|---|---|---|
| #958 | Rechte für alle Funktionen serverseitig durchsetzen | |
| #959 | Rollen Besitzer, Vorstand, Kassier:in, Leser, Rechte für Rollen, Kategorien und mehrere Besitzer | #958 |
| #960 | Buchungen durch die Kassenprüfung prüfen und festschreiben (zurückgestellt) | #959 |

Technik: Quarkus `@PermissionsAllowed` mit `deny-unannotated-endpoints`, Rechte pro Verein aus dem `AccessService`.
