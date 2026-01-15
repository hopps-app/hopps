# Frontend Refactoring Plan

## Executive Summary

Dieses Dokument beschreibt die identifizierten Architektur-Probleme im Frontend und schlägt eine Migration zu einer **Feature-Slice Architecture** vor - eine Kombination aus Feature-basierter Organisation und klarer Schichtentrennung.

---

## Aktuelle Probleme

### 1. Chaotische UI-Komponenten-Struktur

**Problem:** Doppelte Abstraktionsebenen ohne klare Verantwortlichkeiten

```
components/ui/
├── Button.tsx              ← Wrapper um BaseButton
├── Select.tsx              ← Wrapper um BaseSelect
├── Calendar.tsx            ← Eigenständig? Oder shadcn?
└── shadecn/
    ├── BaseButton.tsx      ← shadcn-Komponente
    ├── BaseSelect.tsx      ← shadcn-Komponente
    └── Calendar.tsx        ← Dupliziert!
```

**Konkretes Beispiel:**
- `Button.tsx` wrapppt `shadecn/BaseButton.tsx` nur um ein Icon hinzuzufügen
- `Select.tsx` wrapppt `shadecn/BaseSelect.tsx` nur um ein Label hinzuzufügen
- `Calendar.tsx` existiert ZWEIMAL (in `/ui/` und `/ui/shadecn/`)

**Bewertung:** Diese Wrapper-Schicht bringt wenig Mehrwert und erhöht die Komplexität.

### 2. Inkonsistente Hook-Platzierung

**Problem:** Hooks sind über 4+ verschiedene Orte verstreut

```
hooks/
├── queries/
│   ├── useBommels.ts       ← React Query Hook
│   └── useCategories.ts    ← React Query Hook
├── use-debounce.ts
└── use-toast.ts

components/Categories/hooks/
└── useCategories.ts        ← DUPLIZIERT! (useState/useEffect)

components/views/OrganizationSettings/hooks/
├── useTreeCalculations.ts
└── useOrganizationTree.ts

components/Receipts/hooks/
└── useReceiptFilters.ts
```

**Kritisch:** `useCategories` existiert ZWEIMAL mit unterschiedlichen Implementierungen!
- `hooks/queries/useCategories.ts` - verwendet React Query (modern, empfohlen)
- `components/Categories/hooks/useCategories.ts` - verwendet useState/useEffect (veraltet)

### 3. Vermischte Architektur-Patterns

**Problem:** Kein konsistentes Organisationsprinzip

| Feature | Struktur | Pattern |
|---------|----------|---------|
| OrganizationSettings | `views/OrganizationSettings/{components,hooks}/` | Feature-Slice ✓ |
| Categories | `Categories/` + `hooks/queries/` | Geteilte Struktur |
| Receipts | `Receipts/{Filters,hooks,helpers}/` | Feature-Slice ✓ |
| BommelTreeView | `BommelTreeView/{components,hooks}/` | Feature-Slice ✓ |
| InvoiceUploadForm | `InvoiceUploadForm/{hooks,types,styles}/` | Feature-Slice ✓ |

Einige Features sind gut strukturiert, andere nicht.

### 4. Views vs. Pages Verwirrung

**Problem:** `components/views/` ist kein klarer Container

```
components/views/
├── DashboardView.tsx           ← Einfache Seite
├── NotFoundView.tsx            ← Einfache Seite
├── OrganizationSettings/       ← Komplettes Feature-Modul!
│   ├── components/
│   ├── hooks/
│   └── index.ts
└── ReceiptUpload/              ← Komplettes Feature-Modul!
```

`views/` enthält sowohl einfache Page-Komponenten als auch komplexe Feature-Module.

### 5. Inkonsistente Naming-Conventions

| Ordner | Convention |
|--------|------------|
| `sidebar-navigation/` | kebab-case |
| `BommelTreeView/` | PascalCase |
| `common/` | lowercase |
| `OrganizationStructureTree/` | PascalCase |

### 6. State Management Fragmentierung

```
store/
├── store.ts              ← Auth-State (Zustand)
└── bommels/
    ├── bommelsStore.ts   ← Bommel-State (Zustand)
    └── types.ts

+ React Query für Server State (hooks/queries/)
```

**Problem:** Unklare Trennung zwischen:
- Client State (Zustand)
- Server State (React Query)
- UI State (lokaler useState)

---

## Vorgeschlagene Architektur: Feature-Slice

### Neue Ordnerstruktur

```
src/
├── app/                        # App-Shell & Routing
│   ├── App.tsx
│   ├── AppRoutes.tsx
│   └── providers/              # QueryClient, Theme, i18n Provider
│
├── features/                   # Feature-Module (Vertical Slices)
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── index.ts
│   │
│   ├── organization/
│   │   ├── components/
│   │   │   ├── OrganizationTree/
│   │   │   └── OrganizationStats/
│   │   ├── hooks/
│   │   │   ├── useOrganization.ts
│   │   │   └── useOrganizationTree.ts
│   │   ├── pages/
│   │   │   ├── OrganizationSettingsPage.tsx
│   │   │   └── OrganizationStructurePage.tsx
│   │   └── index.ts
│   │
│   ├── bommels/
│   │   ├── components/
│   │   │   ├── BommelCard/
│   │   │   ├── BommelTreeView/
│   │   │   └── BommelSelector/
│   │   ├── hooks/
│   │   │   ├── useBommels.ts
│   │   │   └── useCreateBommel.ts
│   │   ├── store/              # Feature-spezifischer State
│   │   │   └── bommelsStore.ts
│   │   └── index.ts
│   │
│   ├── documents/
│   │   ├── components/
│   │   │   ├── DocumentUpload/
│   │   │   ├── DocumentList/
│   │   │   └── DocumentFilters/
│   │   ├── hooks/
│   │   ├── pages/
│   │   │   ├── DocumentsPage.tsx
│   │   │   └── DocumentUploadPage.tsx
│   │   └── index.ts
│   │
│   ├── categories/
│   │   ├── components/
│   │   ├── hooks/
│   │   │   └── useCategories.ts  # EINE Implementierung
│   │   └── index.ts
│   │
│   └── dashboard/
│       ├── components/
│       ├── pages/
│       │   └── DashboardPage.tsx
│       └── index.ts
│
├── shared/                     # Geteilte Ressourcen
│   ├── components/             # Wiederverwendbare UI-Komponenten
│   │   ├── primitives/         # Basis shadcn-Komponenten (unverändert)
│   │   │   ├── Button.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Dialog.tsx
│   │   │   └── ...
│   │   ├── composed/           # Zusammengesetzte Komponenten
│   │   │   ├── IconButton.tsx
│   │   │   ├── LabeledSelect.tsx
│   │   │   ├── SearchField.tsx
│   │   │   └── ...
│   │   └── layout/             # Layout-Komponenten
│   │       ├── Sidebar/
│   │       ├── Header/
│   │       └── PageContainer.tsx
│   │
│   ├── hooks/                  # Globale, wiederverwendbare Hooks
│   │   ├── useDebounce.ts
│   │   ├── useToast.ts
│   │   └── useSearch.ts
│   │
│   ├── services/               # API & externe Services
│   │   ├── api/
│   │   │   └── apiClient.ts
│   │   ├── storage/
│   │   │   └── localStorage.ts
│   │   └── i18n/
│   │       └── languageService.ts
│   │
│   ├── store/                  # Globaler App-State
│   │   └── authStore.ts
│   │
│   ├── guards/                 # Route Guards
│   │   └── AuthGuard.tsx
│   │
│   ├── types/                  # Globale TypeScript Types
│   │   └── globals.d.ts
│   │
│   └── lib/                    # Utility-Funktionen
│       └── utils.ts
│
├── assets/                     # Statische Assets
│
└── locales/                    # i18n Übersetzungen
```

---

## UI-Komponenten Neustrukturierung

### Challenge: Ist der aktuelle `ui/` Ordner optimal?

**Nein.** Die aktuelle Struktur hat drei Probleme:

1. **Überflüssige Wrapper-Schicht**
   - `Button.tsx` wrapppt nur `BaseButton` für Icons
   - `Select.tsx` wrapppt nur `BaseSelect` für Labels
   - Diese Wrapper erhöhen Komplexität ohne echten Mehrwert

2. **Unklare Verantwortlichkeiten**
   - Was gehört in `ui/` vs `ui/shadecn/`?
   - Entwickler wissen nicht, welche Komponente sie nutzen sollen

3. **Duplikate**
   - `Calendar.tsx` existiert in beiden Ordnern

### Empfehlung: Drei-Ebenen-Komponenten-Architektur

```
shared/components/
├── primitives/          # Ebene 1: Basis-Bausteine
│   │                    # → Direkt von shadcn/ui oder Radix
│   │                    # → Minimal angepasst (nur Styling)
│   │                    # → KEINE Business-Logik
│   ├── Button.tsx       # shadcn button, Hopps-gestylt
│   ├── Input.tsx
│   ├── Select.tsx       # Radix Select, Hopps-gestylt
│   ├── Dialog.tsx
│   ├── Popover.tsx
│   ├── Calendar.tsx     # nur EINMAL
│   └── ...
│
├── composed/            # Ebene 2: Zusammengesetzte Komponenten
│   │                    # → Kombinieren Primitives
│   │                    # → Häufig wiederverwendet
│   │                    # → Können Labels, Icons, etc. enthalten
│   ├── IconButton.tsx   # Button + Icon
│   ├── SearchField.tsx  # Input + Search Icon + Clear Button
│   ├── LabeledInput.tsx # Label + Input + Error Message
│   ├── DatePicker.tsx   # Popover + Calendar + Input
│   ├── ComboBox.tsx     # Popover + Command + Input
│   └── ...
│
└── layout/              # Ebene 3: Struktur-Komponenten
    │                    # → App-weite Layout-Patterns
    ├── PageContainer.tsx
    ├── Card.tsx
    ├── Sidebar/
    └── Header/
```

### Migration der aktuellen Komponenten

| Aktuell | Neu | Aktion |
|---------|-----|--------|
| `ui/shadecn/BaseButton.tsx` | `primitives/Button.tsx` | Umbenennen, "Base"-Prefix entfernen |
| `ui/Button.tsx` | `composed/IconButton.tsx` | Nur wenn Icon-Button wirklich gebraucht wird |
| `ui/shadecn/BaseSelect.tsx` | `primitives/Select.tsx` | Umbenennen |
| `ui/Select.tsx` | `composed/LabeledSelect.tsx` | Falls Label benötigt |
| `ui/Calendar.tsx` | LÖSCHEN | Duplikat |
| `ui/shadecn/Calendar.tsx` | `primitives/Calendar.tsx` | Behalten |
| `ui/TextField.tsx` | `composed/LabeledInput.tsx` | Konsolidieren |
| `ui/SearchField/` | `composed/SearchField.tsx` | Verschieben |

---

## Migrations-Strategie

### Phase 1: Grundstruktur (Breaking Changes minimieren)

1. **Neue Ordner erstellen**
   ```
   src/app/
   src/features/
   src/shared/
   ```

2. **`shared/components/primitives/` einrichten**
   - shadcn-Komponenten von `ui/shadecn/` verschieben
   - "Base"-Prefix entfernen
   - Index-Datei mit Re-Exports

3. **`shared/components/composed/` einrichten**
   - Wrapper-Komponenten prüfen und konsolidieren
   - Nur behalten wenn wirklich Mehrwert

### Phase 2: Feature-Migration (inkrementell)

Pro Feature:
1. Feature-Ordner in `features/` erstellen
2. Komponenten, Hooks, Types verschieben
3. Index-Datei mit Public API erstellen
4. Imports in anderen Dateien aktualisieren

**Empfohlene Reihenfolge:**
1. `auth/` - Am isoliertesten
2. `categories/` - Klein, guter Test
3. `bommels/` - Gut strukturiert, moderate Größe
4. `documents/` - Receipts + InvoiceUpload zusammenführen
5. `organization/` - Größtes Feature, am Ende
6. `dashboard/` - Einfach, zum Schluss

### Phase 3: Cleanup

1. Alte `components/views/` Struktur löschen
2. `components/ui/` löschen (durch `shared/components/` ersetzt)
3. Verwaiste Hooks/Services aufräumen
4. Import-Aliases in `vite.config.ts` aktualisieren

---

## Konkrete Aktionen

### Sofort (Quick Wins)

- [ ] Duplikat `hooks/queries/useCategories.ts` vs `components/Categories/hooks/useCategories.ts` auflösen
  - React Query Version behalten
  - `Categories/hooks/useCategories.ts` löschen und Imports aktualisieren

- [ ] `ui/Calendar.tsx` Duplikat löschen

- [ ] Naming-Conventions vereinheitlichen: Alle Ordner in `PascalCase`

### Kurzfristig

- [ ] `shared/components/primitives/` erstellen mit konsolidierten shadcn-Komponenten
- [ ] `shared/components/composed/` mit tatsächlich genutzten Wrapper-Komponenten
- [ ] Index-Dateien mit sauberen Re-Exports

### Mittelfristig

- [ ] Feature-Module erstellen und migrieren
- [ ] Tests pro Feature-Modul organisieren
- [ ] Storybook für `shared/components/` einrichten

---

## Vorteile der neuen Architektur

1. **Klarheit:** Jeder weiß, wo Code hingehört
2. **Isolation:** Features können unabhängig entwickelt werden
3. **Wiederverwendbarkeit:** `shared/` ist der einzige Ort für geteilten Code
4. **Skalierbarkeit:** Neue Features folgen dem gleichen Pattern
5. **Testbarkeit:** Tests neben dem Code, den sie testen
6. **Code-Ownership:** Teams können Features "besitzen"

---

## Risiken und Mitigationen

| Risiko | Mitigation |
|--------|------------|
| Große Anzahl Breaking Changes | Inkrementelle Migration, Feature für Feature |
| Import-Pfad-Änderungen | Path Aliases (`@/features/`, `@/shared/`) verwenden |
| Team-Einarbeitung | Dokumentation, ADR für Architektur-Entscheidungen |
| Übergangszeit mit gemischter Struktur | Klare Markierung von "Legacy"-Code |

---

## Entscheidungshilfen

### Wann gehört Code in `features/`?

- Es ist Feature-spezifisch
- Es wird nur von diesem Feature verwendet
- Es hat keine Abhängigkeiten zu anderen Features

### Wann gehört Code in `shared/`?

- Es wird von 2+ Features verwendet
- Es ist generisch und wiederverwendbar
- Es hat keine Feature-spezifische Logik

### Wann erstelle ich eine neue Composed Component?

- Die Kombination wird 3+ mal verwendet
- Sie kapselt echte wiederverwendbare Logik
- Sie ist nicht Feature-spezifisch

---

## Fazit

Die aktuelle Frontend-Architektur leidet unter organischem Wachstum ohne klares Organisationsprinzip. Die vorgeschlagene **Feature-Slice Architecture** bietet:

1. **Klare Grenzen** zwischen Features
2. **Reduzierte Komplexität** durch Eliminierung überflüssiger Abstraktionen
3. **Bessere Wartbarkeit** durch co-lokierte Feature-spezifische Logik
4. **Konsistente Patterns** für zukünftige Entwicklung

Die Migration sollte inkrementell erfolgen, um das Risiko von Breaking Changes zu minimieren.
