# Hopps - Cloud-basierte Open-Source Buchhaltungssoftware mit KI

## Projektübersicht

Hopps ist eine cloud-basierte Open-Source Buchhaltungssoftware mit KI für gemeinnützige Organisationen (Vereine). Das Projekt wird von der Deutschen Stiftung für Engagement und Ehrenamt gefördert und vom Open Project e.V. Pfaffenhofen an der Ilm entwickelt.

**Architektur:** Monorepo mit Microservices-Architektur

## Projektstruktur

```
/backend          - Java Microservices (Quarkus)
/frontend         - Frontend-Anwendungen (SPA + Mobile)
  /spa            - React Web-Anwendung
  /mobile         - React Native Mobile App
  /api-client     - Shared TypeScript API Client
  /figma_inspo    - UI/UX Design Inspiration und Referenzimplementierungen
  /keycloak-theme - Custom Keycloak Theme
/infrastructure   - Docker Compose & Deployment
/charts           - Helm Charts für Kubernetes
/bpmn             - Business Process Models
/pacts            - Contract Testing Files
/architecture     - Architekturdokumentation
```

## Backend

### Tech Stack
- **Framework:** Quarkus 3.19.2
- **Sprache:** Java 21
- **Build:** Maven
- **Datenbank:** PostgreSQL mit Flyway Migrations
- **ORM:** Hibernate mit Panache
- **Messaging:** Apache Kafka (SmallRye Reactive Messaging)
- **Auth:** Keycloak (OAuth2/OIDC)
- **Authorization:** OpenFGA (Fine-Grained Authorization)
- **BPM:** Kogito (jBPM)
- **Storage:** AWS S3 (MinIO lokal)
- **AI/ML:** LangChain4j mit OpenAI, Azure Document AI

### Microservices

#### app.hopps.org (Port 8101)
**Haupt-Service für Organisation und Member Management**

**Domain Models:**
- `Organization` - Hauptentität für Vereine (Name, Slug, Typ, Adresse, Website)
- `Member` - Benutzer mit Verknüpfung zu mehreren Organisationen
- `Bommel` - Hierarchische Baumstruktur für Organisationseinheiten (Abteilungen/Teams)
- `Category` - Kategorisierungssystem für Transaktionen
- `TransactionRecord` - Finanztransaktionen mit Dokumentreferenzen

**API Endpoints:**
- `/organization` - Organisation CRUD + Registrierungsworkflow
- `/bommel` - Baumstruktur-Management mit rekursiven Operationen
- `/member` - Member-Verwaltung
- `/category` - Kategorie-Verwaltung
- `/transaction` - Transaktionsdatensätze
- `/document` - Dokumenten-Upload und Abruf

**Features:**
- BPMN-Workflow für Organisationserstellung
- Keycloak User Provisioning
- OpenFGA Authorization Model
- Kafka Event Consumption für Invoice/Receipt Daten
- S3 Dokumentenspeicherung

#### app.hopps.fin-narrator (Port 8775)
KI-gestützte Dokumenten-Tagging und Kategorisierung mit LangChain4j + OpenAI

#### app.hopps.az-document-ai (Port 8100)
Dokumentenanalyse mit Azure Document Intelligence (OCR, Datenextraktion)

#### app.hopps.zugferd (Port 8103)
ZUGFeRD-Rechnungsverarbeitung (XML aus PDFs extrahieren)

#### app.hopps.mailservice
E-Mail-Benachrichtigungsservice (aktuell deaktiviert)

### Datenbank Setup
- **Flyway Migrations:** `/src/main/resources/db/migration`
- **Testdaten:** `/src/main/resources/db/testdata` (dev mode)
- **Multi-Database:** Separate DBs für org, keycloak, openfga
- **Schema Version:** V1.0.2

### Bekannte Architektur-Issues
Es gibt 8 identifizierte Inkonsistenzen im Backend:
1. Inkonsistente REST Package-Benennung (`rest/` vs `endpoint/`)
2. Unterschiedliche Entity-Organisation (`jpa/` vs `jpa/entities/`)
3. Code-Duplikate (KogitoEndpointFilter, getUserOrganization)
4. Gemischte DTO-Patterns (records vs classes)
5. Naming Collisions (Bommel Entity vs Bommel DTO)
6. Business Logic Layer Benennung (`delegates/` vs `bpmn/`)
7. Falsch platzierter Infrastructure Code
8. Unvollständige Resources (MemberResource)

**Geplante Verbesserung:** Migration zu Vertical Slice Architecture (siehe `backend-vertical-slice-plan.md`)

## Frontend

### SPA (Single Page Application)

**Tech Stack:**
- **Framework:** React 18.3.1
- **Build:** Vite 6.0.6
- **Sprache:** TypeScript 5.5.3
- **Routing:** React Router v7.5.2
- **State:** Zustand 5.0.0
- **API:** @tanstack/react-query 5.80.6
- **UI:** Radix UI + TailwindCSS 3.4.14
- **Forms:** React Hook Form 7.66.0 + Zod
- **Grid:** AG Grid 32.3.3
- **i18n:** i18next 23.16.0
- **Auth:** Keycloak-js 24.0.5

**Features:**
- Drag-and-drop File Upload (react-dropzone)
- PDF Viewing (pdfjs-dist)
- Tree Visualisierung (react-d3-tree, @minoru/react-dnd-treeview)
- Emoji Support (emoji-mart)

**Struktur:**
```
src/
├── components/
│   ├── ui/                    - Wiederverwendbare UI-Komponenten (shadcn/ui-inspiriert)
│   ├── views/                 - Seiten-Level Komponenten
│   ├── BommelTreeView/        - Organisations-Baumvisualisierung
│   ├── Categories/            - Kategorie-Management
│   └── Forms/                 - Formular-Komponenten
├── services/
│   ├── auth/                  - Keycloak Authentication
│   ├── ApiService.ts
│   └── OrganisationTreeService.ts
├── store/                     - Zustand Stores
├── hooks/                     - Custom React Hooks
├── guards/                    - Route Guards (AuthGuard)
├── layouts/                   - Layout-Komponenten
└── locales/                   - i18n Übersetzungen
```

**Hauptrouten:**
- `/` - Landing Page
- `/demo` - Demo-Ansicht
- `/register` - Organisationsregistrierung
- `/dashboard/*` - Haupt-Dashboard (protected)
- `/structure/*` - Organisationsstruktur-Management (protected)
- `/receipts/new` - Beleg-Upload (protected)
- `/admin/categories` - Kategorie-Management (protected)
- `/profile` - Benutzereinstellungen (protected)

### Mobile App

**Tech Stack:**
- **Framework:** React Native 0.76.3 via Expo 52.0.11
- **Router:** Expo Router 4.0.9
- **UI:** NativeWind 4.1.23 (TailwindCSS für React Native)
- **Icons:** Lucide React Native
- **HTTP:** Axios mit Auth Refresh

**Plattformen:** iOS, Android, Web (via Expo)

### API Client (@hopps/api-client)
- Auto-generiert aus OpenAPI Specs mit NSwag
- Type-safe API Calls
- Token Refresh Handling
- Verwendet von SPA und Mobile

### figma_inspo Ordner
Der `frontend/figma_inspo` Ordner dient als **Inspiration für UI/UX Design und Komponenten**. Dieser Ordner enthält Referenzimplementierungen und Designvorlagen, die als Grundlage für die Entwicklung neuer Features verwendet werden können.

## Build & Deployment

### Build Tools
- **Backend:** Maven mit Quarkus Plugin
- **Frontend:** pnpm Workspace, Vite (SPA), Expo CLI (Mobile)

### Docker (Lokale Entwicklung)
**Services (docker-compose.yaml):**
- `org` - Organization Service (8080)
- `fin-narrator` - AI Tagging (8775)
- `az-document-ai` - Document Analysis (8100)
- `postgres` - PostgreSQL 16
- `kafka` - Bitnami Kafka 3.9 (KRaft)
- `keycloak` - Bitnami Keycloak 26 (8092)
- `openfga` - OpenFGA v1.5.9 (9080-9081, Playground 3000)
- `localstack` - AWS S3 Mock

**Benötigte Umgebungsvariablen:**
```bash
HOPPS_AZURE_DOCUMENT_AI_ENDPOINT
HOPPS_AZURE_DOCUMENT_AI_KEY
QUARKUS_LANGCHAIN4J_OPENAI_API_KEY
```

### CI/CD (GitHub Actions)
- **Backend Workflow:** Matrix Build für 4 Services, Docker Push zu GHCR
- **Frontend Workflow:** Lint, Test, Build, Docker Push
- **Auto-Deployment:** zu dev environment bei main branch
- **Container Registry:** ghcr.io/hopps-app/hopps

### Kubernetes/Helm
**Chart:** `/charts/hopps` (Version 0.1.15)
**Dependencies:** KeycloakX, OpenFGA, Kafka UI, Kafka, PostgreSQL

## Testing

### Backend
- **Framework:** JUnit 5, REST Assured, Mockito
- **Mocking:** WireMock für HTTP
- **Test Data:** Instancio 5.4.0
- **Contract Testing:** Pact
- **Coverage:** Jacoco → SonarCloud
- **Struktur:** Unit Tests + Integration Tests (IT suffix)

### Frontend
- **SPA:** Vitest 2.1.3, React Testing Library
- **Mobile:** Jest mit jest-expo
- **Contract Testing:** Pact Foundation
- **Command:** `pnpm run validate` (lint + test)

### Pact Contract Testing
- Consumer: SPA generiert Pacts
- Provider: Backend verifiziert Pacts
- Storage: `/pacts` Verzeichnis
- Stub Server für lokale Entwicklung

## Wichtige Konventionen

### Backend Code-Organisation (Geplant nach Vertical Slice)
```
src/main/java/app/hopps/{feature}/
├── api/           - REST Endpoints
├── domain/        - Entities, Domain Models
├── repository/    - Panache Repositories
├── service/       - Business Logic
└── dto/           - Data Transfer Objects
```

### API-Entwicklung
- OpenAPI/Swagger verfügbar unter `/q/swagger-ui`
- Specs unter `target/openapi/openapi.json`
- REST Assured für API-Tests
- Keycloak-Integration für Auth
- OpenFGA für Fine-Grained Authorization

### Frontend-Entwicklung
- Komponenten in `components/ui/` folgen shadcn/ui Patterns
- State Management mit Zustand
- API Calls via React Query
- i18n für alle User-facing Strings
- Route Guards für geschützte Routen

## BPMN Prozesse
3 Business Prozesse modelliert:
1. `NewOrganization.bpmn` - Organisationserstellungs-Workflow (aktiv)
2. `Auslagen_Workflow_Prozess.bpmn` - Auslagenerstattung
3. `Einladen_Von_Neuen_Mitgliedern.bpmn` - Mitgliedereinladung

## Dokumentation
- **Main README:** Projekt-Übersicht, Setup
- **Service READMEs:** Spezifische Setup-Anleitungen
- **Architektur:** `/architecture/architecture.drawio`
- **Analyse-Docs:**
  - `backend-structure-analysis.md` - Aktuelle Backend-Issues
  - `backend-vertical-slice-plan.md` - Migrations-Plan
  - `backend-test-structure-migration.md` - Test-Organisation

## Wichtige Hinweise für AI-Assistenten

### Bei Backend-Änderungen:
1. Folge dem geplanten Vertical Slice Architecture Pattern
2. Verwende konsistente Package-Benennung (`api/` statt `endpoint/`)
3. Vermeide Code-Duplikation - extrahiere zu common package
4. DTOs als Records (nicht Classes)
5. Alle DB-Änderungen als Flyway Migrations
6. Tests in entsprechender Struktur anlegen

### Bei Frontend-Änderungen:
1. Neue UI-Komponenten in `components/ui/`
2. Verwende TypeScript strict mode
3. **Alle Strings via i18next** - siehe Internationalisierung weiter unten
4. State Management mit Zustand
5. Forms mit React Hook Form + Zod Validation
6. Teste mit Vitest + React Testing Library

### Internationalisierung (i18n):
**WICHTIG:** Hopps ist eine mehrsprachige Anwendung mit primärer Unterstützung für Deutsch und Englisch.

**Strikte Regeln:**
1. **Keine Hart-kodierten Texte:** NIEMALS direkte Texte im Code hinterlegen, die vom Benutzer gesehen werden können
2. **Immer i18next verwenden:** Alle User-facing Strings MÜSSEN über `t('translation.key')` geladen werden
3. **Mindestens zwei Sprachen:** Jeder neue Text benötigt SOWOHL deutsche ALS AUCH englische Übersetzung
4. **Konsistente Keys:** Verwende aussagekräftige, hierarchische Translation Keys (z.B. `organization.settings.structure`)

**Übersetzungs-Dateien:**
- Deutsch: `/frontend/spa/src/locales/de/translation.json`
- Englisch: `/frontend/spa/src/locales/en/translation.json`

**Beispiel - FALSCH:**
```tsx
<Button>Speichern</Button>
<h3>Organisationsstruktur:</h3>
```

**Beispiel - RICHTIG:**
```tsx
const { t } = useTranslation();
<Button>{t('common.save')}</Button>
<h3>{t('organization.settings.structure')}:</h3>
```

**Bei neuen Features:**
1. Erstelle Translation Keys in beiden Sprachdateien
2. Verwende `useTranslation()` Hook in Komponenten
3. Gruppiere Keys logisch (z.B. alle `organization.*` zusammen)
4. Dokumentiere Kontext bei mehrdeutigen Begriffen

### Bei API-Änderungen:
1. OpenAPI-Spec wird automatisch generiert
2. API Client muss mit NSwag regeneriert werden
3. Pact Tests für Consumer/Provider aktualisieren
4. Keycloak Roles beachten
5. OpenFGA Authorization Rules prüfen

## Nächste Schritte (Priorisiert)
1. ✅ Backend: Vertical Slice Architecture Migration
2. ⏳ Backend: Test Coverage erhöhen
3. ⏳ Frontend: Mehr Test Coverage
4. ⏳ Code-Duplikate eliminieren
5. ⏳ MemberResource vervollständigen
- /clear