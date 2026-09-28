---
name: anforderungen-beantworten
description: Beantwortet Anforderungsdokumente, User-Story-Listen, Fragebögen, Ausschreibungen oder Interview-Fragen von Vereinen/Verbänden/Interessenten zu Hopps – Punkt für Punkt, mit Status (vorhanden/teilweise/fehlt) und als geordnetes Antwortdokument (docx). Nutzen, wenn ein Kunden-/Interessenten-Dokument (PDF, Word, Mail) mit Anforderungen, Fragen oder Wünschen übergeben wird, z. B. aus OneDrive "01_Produkt/Interviews", oder wenn gefragt wird "kann Hopps X?", "Anforderungen beantworten", "Fragebogen ausfüllen", "Feature-Abgleich", "Fit-Gap".
---

# Anforderungsdokumente beantworten

Wissensbasis: `docs/wissensdatenbank/` (Einstieg `README.md`). Immer zuerst dort nachschlagen,
erst dann im Code suchen.

## Ablauf

1. **Anfrage lesen** – PDF: `pdftotext -layout`, Word: `pandoc -t markdown` bzw. `textutil`.
   Jede Anforderung mit Original-ID, Rolle, Prio und Wortlaut als Liste extrahieren. Nichts weglassen,
   auch Rollenbeschreibungen, Rahmenbedingungen (Sprachen, Währungen, Aufbewahrung) zählen.
2. **Begriffe abbilden** über `docs/wissensdatenbank/06-glossar.md` (z. B. Anlass → Bommel,
   Quittung → Beleg, Kassier → Finanzrolle). Unbekannte Begriffe notieren.
3. **Status bestimmen** je Anforderung aus `02-funktionsumfang.md` (+ `03`, `04`, `05`),
   Skala aus `README.md` (✅ 🟡 🔜 💡 ❌ ❓).
   - **Entscheidende Aussagen im Code verifizieren** (Stand-Datum der Wissensdatenbank beachten;
     `git log --since=<Stand-Datum>` zeigt, ob sich seither etwas geändert hat).
     Bei vielen Anforderungen: einen Explore-Agent mit der vollständigen Liste losschicken.
   - Aktuellen Branch beachten – nur `main`/released zählt als ✅, Feature-Branches = 🔜.
4. **❓ sammeln** (Preise, SLA, Zusagen, Kooperationsmodell, Termine) und dem User als Liste
   vorlegen, **bevor** das Dokument als final gilt. Niemals raten.
5. **Antwortdokument erstellen** nach `07-antwort-leitfaden.md` (Kurzfazit, Status-Übersicht,
   Detailantworten je ID, Rückfragen, nächste Schritte, Legende). Format `.docx`
   (Skill `anthropic-skills:docx`), gerendert prüfen. Ablage **neben der Anfrage im OneDrive**,
   nie im Repo (Repo ist öffentlich).
6. **Wissensdatenbank nachpflegen** (anonymisiert, keine Kundennamen/Personendaten):
   - neue Fragen → `05-faq.md`
   - neue Begriffe → `06-glossar.md`
   - neue Wünsche / Zähler erhöhen → `04-roadmap.md` („Aus Kundenanfragen gesammelte Wünsche")
   - im Code gefundene Abweichungen → `02-funktionsumfang.md` korrigieren, Stand-Datum setzen

## Qualitätskriterien

- Jede Anforderung der Anfrage taucht mit ihrer ID im Antwortdokument auf.
- Kein ✅ ohne Code-Beleg; Lücken klar benennen („vorhanden ist …, noch nicht …").
- Keine Termine, keine Preise, keine Zusagen ohne Bestätigung durch den User.
- Kundensprache und regionale Schreibweise (CH: ss statt ß) verwenden.
