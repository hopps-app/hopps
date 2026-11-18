# PRD: Rollen und Rechte

Stand: 18.11.2026 · Status: Entwurf

## Problem

Heute prüft hopps nur bei der Mitgliederverwaltung, wer etwas darf. Jedes eingeladene Mitglied kann die gesamte Buchhaltung sehen und bearbeiten. Im Verein haben aber nicht alle dieselbe Aufgabe:

- Die **Kasse** führt die Bücher.
- Der **Vorstand** will die Finanzen im Blick haben, ohne selbst zu buchen.
- Die **Kassenprüfung** muss alles sehen, darf aber nichts ändern, damit sie unabhängig prüfen kann. Was sie geprüft hat, soll danach nicht mehr veränderbar sein (GoBD).

## Ziele

- Jedes Mitglied kann nur das tun, was seine Rolle erlaubt, auch wenn es die Oberfläche umgeht.
- Vereine können Vorstand und Kassenprüfung einladen, ohne ihnen Schreibrechte zu geben.
- Die Kassenprüfung kann bestätigte Buchungen prüfen und damit festschreiben.
- Für bestehende Vereine ändert sich durch das Update nichts, bis die Gründer:in Rollen vergibt.

## Rollen

| Rolle | Für | Darf |
|---|---|---|
| Gründer:in | Person, die den Verein angelegt hat | alles, dazu Mitglieder einladen, entfernen und Rollen vergeben |
| Kasse | Kassenwart:in, Schatzmeister:in | Buchhaltung sehen, bearbeiten und bestätigen, Vereinsdaten pflegen |
| Vorstand | Vorsitzende, weitere Vorstandsmitglieder | alles sehen, nichts ändern |
| Kassenprüfung | gewählte Kassenprüfer:innen | alles sehen, bestätigte Buchungen prüfen und damit festschreiben |

Es gibt immer genau eine Gründer:in pro Verein. Die Rolle gilt pro Verein: Dieselbe Person kann in zwei Vereinen unterschiedliche Rollen haben.

## Entscheidungen

- **Zentrale Rechteprüfung auf dem Server.** Grundregel: Etwas ansehen braucht das Leserecht, etwas ändern das Bearbeitungsrecht. Wo eine Funktion ein anderes Recht braucht (z. B. Vereinsdaten, Mitglieder), wird das an der Funktion festgelegt. Neue Funktionen sind damit automatisch geschützt.
- **Die Gründer:in prüft nicht.** Das Recht, Buchungen zu prüfen und festzuschreiben, hat nur die Kassenprüfung. Wer bucht, prüft nicht die eigene Arbeit.
- **Zwei Schritte: erst bestätigen, dann prüfen.** Die Kasse bestätigt eine Buchung, wenn sie vollständig und mit dem Bankumsatz verknüpft ist. Danach kann die Kassenprüfung sie prüfen. „Geprüft“ ist ein eigener Status nach „bestätigt“, den nur die Kassenprüfung setzen kann. Die Kasse prüft nicht, die Kassenprüfung bestätigt nicht.
- **Geprüft heißt festgeschrieben, pro Buchung.** Die Markierung ist endgültig. Die Kassenprüfung kann auch alle bestätigten Buchungen bis zu einem Stichtag auf einmal als geprüft markieren.
- **Vereinsdaten pflegt nicht der Vorstand.** Name, Adresse und Logo ändern nur Gründer:in und Kasse. Der Vorstand sieht sie nur.
- **Bestehende Mitglieder werden Kasse.** Die Rolle Kasse entspricht genau den heutigen Rechten eingeladener Mitglieder. Es müssen keine Daten umgeschrieben werden.

## Bestehende Vereine

- Die Gründer:in kann nach dem Update weiterhin alles.
- Bisher eingeladene Mitglieder haben die Rolle Kasse und behalten ihre bisherigen Rechte.
- Die Gründer:in sieht einmalig in der Mitgliederliste den Hinweis, dass jetzt Rollen vergeben werden können, und kann dort Vorstand und Kassenprüfung umstellen.

## Offene Fragen

- **Stornobuchung:** Ohne sie lässt sich ein Fehler in einer geprüften Buchung nicht mehr korrigieren. Muss vor dem Release des Prüfens geklärt sein: eigenes Issue davor oder Teil davon?

## Umsetzung

Übersicht: #957

| Issue | Inhalt | Baut auf |
|---|---|---|
| #958 | Rechte für alle Funktionen serverseitig durchsetzen | |
| #959 | Rollen Vorstand und Kassenprüfung | #958 |
| #960 | Buchungen durch die Kassenprüfung prüfen und festschreiben | #959 |

Technik: Quarkus `@PermissionsAllowed` mit `deny-unannotated-endpoints`, Rechte pro Verein aus dem `AccessService`.
