# Hopps-Wissensdatenbank

Zentrale, faktenbasierte Wissensbasis, um **Anforderungsdokumente, Fragebögen und Interview-Fragen
von (potenziellen) Kund:innen** schnell und konsistent zu beantworten – z. B. User-Story-Listen,
Ausschreibungs-Checklisten oder Datenschutz-Fragebögen von Vereinen und Verbänden.

> ⚠️ **Dieses Repo ist öffentlich (GitHub `hopps-app/hopps`).**
> Hier stehen nur Informationen, die auch öffentlich sein dürfen: Funktionsumfang, Technik, Hosting,
> Roadmap-Richtung. **Keine** Kundennamen mit Gesprächsinhalten, Preisangebote, Verträge,
> Personendaten oder interne Einschätzungen zu einzelnen Interessenten.
> Kundenspezifische Anfragen und Antworten liegen im OneDrive:
> `General - Hopps/01_Produkt/Interviews/`.

## Aufbau

| Datei | Inhalt | Typische Fragen |
|---|---|---|
| [01-produkt-und-organisation.md](01-produkt-und-organisation.md) | Was ist Hopps, Träger, Lizenz, Zielgruppe, Betriebsmodelle | „Wer steht dahinter?", „Open Source?", „Was kostet es?" |
| [02-funktionsumfang.md](02-funktionsumfang.md) | **Feature-Katalog mit Status + Code-Belegen** | „Kann Hopps X?" |
| [03-technik-hosting-datenschutz.md](03-technik-hosting-datenschutz.md) | Architektur, Hosting-Orte, Sub-Dienstleister, KI, Login/SSO, Self-Hosting, Aufbewahrung | „Wo liegen die Daten?", „DSGVO/nDSG?", „SSO mit unserem IdP?" |
| [04-roadmap.md](04-roadmap.md) | Geplante / angedachte Erweiterungen (keine Zusagen) | „Kommt X noch?" |
| [05-faq.md](05-faq.md) | Wiederkehrende Fragen mit Standardantwort | Kurzantworten |
| [06-glossar.md](06-glossar.md) | Begriffs-Mapping Kundensprache → Hopps-Begriffe (inkl. CH-Varianten) | „Anlass", „Kassier", „Quittung", „Spesen" … |
| [07-antwort-leitfaden.md](07-antwort-leitfaden.md) | Status-Skala, Tonalität, Aufbau eines Antwortdokuments | – |

## Status-Skala (überall einheitlich)

| Status | Bedeutung | Formulierung ggü. Kund:innen |
|---|---|---|
| ✅ **Vorhanden** | Im Code auf `main` umgesetzt und in der App nutzbar | „Wird heute unterstützt." |
| 🟡 **Teilweise** | Grundlage vorhanden, Teilaspekte fehlen | „Teilweise – vorhanden ist …, noch nicht …" |
| 🔜 **Geplant** | In der Roadmap / aktiv in Arbeit (Branch/PR), noch nicht released | „In Planung / in Umsetzung" – **keine Termine zusagen** |
| 💡 **Anpassbar** | Nicht vorhanden, aber mit überschaubarem Aufwand auf bestehenden Strukturen umsetzbar | „Nicht vorhanden, aber gut umsetzbar" |
| ❌ **Nicht vorhanden** | Nicht umgesetzt, keine konkrete Planung | „Aktuell nicht unterstützt." |
| ❓ **Offen** | Fakt ist unbekannt – **muss vom Team geklärt werden**, niemals raten | – |

## Pflege-Regeln

1. **Faktenbasiert:** Jede Funktionsaussage in `02-funktionsumfang.md` braucht einen Code-Beleg
   (Pfad, Endpoint, Entity, Route). Keine Marketing-Aussagen ohne Beleg.
2. **Stand-Datum** oben in jeder Datei aktualisieren, wenn Inhalte geändert werden.
3. **Neue Features → Wissensdatenbank mitpflegen:** Wer ein Feature merged, das eine Zeile in
   `02-funktionsumfang.md` verändert, aktualisiert Status und Beleg im selben PR.
4. **Nach jeder beantworteten Anfrage:** Neue Fragen, die nicht abgedeckt waren, als Eintrag in
   `05-faq.md` bzw. neue Begriffe in `06-glossar.md` ergänzen (anonymisiert – ohne Kundennamen).
5. **❓-Einträge** sind Aufgaben: Antwort vom Team einholen und nachtragen.

## Workflow „Anforderungsdokument beantworten"

Details im Skill [`.claude/skills/anforderungen-beantworten`](../../.claude/skills/anforderungen-beantworten/SKILL.md).
Kurzfassung:

1. Dokument lesen, **jede einzelne Anforderung** mit ID extrahieren.
2. Kundensprache über `06-glossar.md` auf Hopps-Begriffe abbilden.
3. Status + Antwort aus `02`–`05` ableiten; bei Unsicherheit im Code verifizieren.
4. Nicht Beantwortbares als ❓ markieren und gesammelt dem Team vorlegen.
5. Antwortdokument (i. d. R. `.docx`) nach `07-antwort-leitfaden.md` erstellen und neben der
   Anfrage im OneDrive ablegen.
6. Wissensdatenbank um neue Erkenntnisse ergänzen (Regel 4).
