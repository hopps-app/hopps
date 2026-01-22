# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Build Commands

```bash
# Run in dev mode with live reload
./mvnw quarkus:dev

# Run tests
./mvnw test

# Run a single test class
./mvnw test -Dtest=TestClassName

# Package the application
./mvnw package

# Validate code formatting
./mvnw formatter:validate

# Format code
./mvnw formatter:format
```

## Architecture

This is a Quarkus web application using the Renarde framework for server-side
rendering.

**Key frameworks:**

- **Quarkus 3.30.x** with Java 21
- **Renarde** - server-side web framework built on Qute templating, RESTEasy
  Reactive
- **Hibernate ORM Panache** - simplified ORM with repository pattern
- **Amazon S3** - file storage via quarkus-amazon-s3 (LocalStack in dev/test)
- **SmallRye Health** - health check endpoints at `/q/health`
- **SmallRye OpenAPI** - API documentation

**Project structure:**

Feature-based package structure:

```
app.fuggs.<feature>/
├── api/          - Renarde controllers (extend Controller)
├── domain/       - Entity classes (extend PanacheEntity)
├── model/        - DTOs/Input classes
├── repository/   - Data access (implement PanacheRepository)
├── service/      - Business logic (e.g., StorageService)
└── messaging/    - Message producers/consumers

app.fuggs.shared/
├── filter/       - HTTP filters
├── infrastructure/storage/  - Storage handlers
├── security/     - Security utilities
├── util/         - Template extensions (JavaExtensions.java)
└── validation/   - Validation utilities
```

Current features:

- `bommel/` - Bommel tree management (api, domain, repository)
- `member/` - Member management (api, domain, repository)
- `document/` - Document/receipt management with S3 file storage and intelligent extraction
- `audit/` - Audit logging (domain, repository)
- `shared/` - Shared utilities
- `simplepe/` - Process engine

**Microservices:**

- `app.fuggs.zugferd` - ZugFerd e-invoice extraction service (port 8103)
- `app.fuggs.az-document-ai` - Azure Document Intelligence integration (port 8200)

Templates: `src/main/resources/templates/<ControllerName>/<method>.html`

## Renarde & Qute Conventions

**Controllers:**

- Extend `Controller` class from Renarde
- Use `@CheckedTemplate` with native method declarations for type-safe templates
- Method names become URL paths: `save()` -> `/resource/save`
- Use `redirect(Resource.class).method()` for redirects
- Use `flash("key", "message")` for flash messages

**Qute CheckedTemplate limitations:**

- NO direct Java method calls like `ZoneId.systemDefault()` in templates
- NO safe navigation operator `?.` (e.g., `object?.field`)
- Solution: Add helper methods to entities for template access:

```java
// In entity class
public String getFormattedDate()
{
	return date != null ? date.format(formatter) : "";
}

public String getSenderName()
{
	return sender != null ? sender.getName() : "";
}
```

**Logging:**

**IMPORTANT:** Always use SLF4J for logging. Never use `System.out.println()` or other logging frameworks.

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

private static final Logger LOG = LoggerFactory.getLogger(MyClass.class);
```

Log levels:
- `LOG.error()` - For failures and exceptions that need attention
- `LOG.warn()` - For issues that might cause problems
- `LOG.info()` - For important operations (user actions, service calls, state changes)
- `LOG.debug()` - For detailed debugging information

Examples:
```java
LOG.info("Created member: {} ({})", member.getFullName(), member.getEmail());
LOG.warn("No Keycloak user found for username: {}", username);
LOG.error("Failed to process document: id={}, error={}", docId, e.getMessage());
LOG.debug("Processing workflow step: {}", stepName);
```

Add reasonable logging for:
- Important operations (create, update, delete)
- External service calls (Keycloak, S3, microservices)
- State changes (workflow transitions, status updates)
- Error conditions and exceptions

**Roles and Security:**

**IMPORTANT:** Always use role constants from `Roles.java` instead of hardcoded strings.

```java
import app.fuggs.shared.security.Roles;
```

Available role constants:
- `Roles.SUPER_ADMIN` = "super_admin" - System administrator with full access
- `Roles.ADMIN` = "admin" - Organization administrator
- `Roles.MEMBER` = "member" - Regular member

Examples:

```java
// In service classes
if (securityIdentity.hasRole(Roles.ADMIN)) {
    // Admin-only operations
}

// In UserContext or template helpers
public boolean isSuperAdmin() {
    return hasRole(Roles.SUPER_ADMIN);
}

// In test classes
@TestSecurity(user = "maria", roles = { Roles.ADMIN, Roles.MEMBER })
void shouldAllowAdminAccess() {
    // Test admin functionality
}
```

**Note:** Some tests may use `"user"` as a role string for legacy reasons, but new code should use `Roles.MEMBER` for consistency. The application is configured to accept both "user" and "member" as valid roles.

**Form handling:**

- Forms require `{#authenticityToken /}` for CSRF protection
- Use `@RestForm` annotation for form parameters
- Multipart forms: `enctype="multipart/form-data"` with `FileUpload` parameter
- Validation: `@NotNull`, `validationFailed()` check

## S3 File Storage

Configuration in `application.properties`:

```properties
bucket.name=fuggs-documents
quarkus.s3.path-style-access=true
quarkus.s3.devservices.buckets=${bucket.name}
```

Dev services automatically start LocalStack for S3 in dev/test mode.

Use `StorageService` for file operations:

```java
@Inject StorageService storageService;

storageService.

uploadFile(key, filePath, contentType);
storageService.

downloadFile(key);
storageService.

deleteFile(key);
```

## Document Analysis Workflow

Document analysis uses a workflow-based approach with ZugFerd extraction first, falling back to Azure Document AI if ZugFerd fails.

**Workflow steps:**

1. **Upload** - Document uploaded to S3 storage
2. **ZugFerd extraction** (AnalyzeDocumentZugFerdTask) - Attempts to extract embedded ZugFerd XML from PDF
3. **AI extraction** (AnalyzeDocumentAiTask) - If ZugFerd fails or document is not PDF, uses Azure Document AI
4. **Review** - User reviews and confirms extracted data

**Extraction source tracking:**

The `ExtractionSource` enum tracks how data was extracted:
- `ZUGFERD` - Data from embedded ZugFerd XML in PDF
- `AI` - Data from Azure Document Intelligence
- `MANUAL` - User-entered data

**ZugFerd service (`app.fuggs.zugferd`):**

Uses Mustang Project library (`org.mustangproject`) to extract ZugFerd XML:

```java
ZUGFeRDImporter importer = new ZUGFeRDImporter();
importer.doIgnoreCalculationErrors(); // Handle incomplete invoices
importer.setInputStream(stream);
Invoice invoice = importer.extractInvoice();

// Get values directly from XML header (not calculated from line items)
BigDecimal grandTotal = parseBigDecimal(importer.getAmount());
BigDecimal totalTax = parseBigDecimal(importer.getTaxTotalAmount());
BigDecimal taxBasis = parseBigDecimal(importer.getTaxBasisTotalAmount());
```

**Important:** Use `ZUGFeRDImporter.getAmount()` and `getTaxTotalAmount()` to read values directly from XML header, not `TransactionCalculator` which returns 0 when calculation errors are ignored.

**Document preview:**

PDF documents are displayed inline using the `/view` endpoint:
- `/belege/{id}/download` - Downloads file with `Content-Disposition: attachment`
- `/belege/{id}/view` - Displays inline with `Content-Disposition: inline`
- Templates use `#navpanes=0` parameter to hide PDF viewer thumbnail sidebar

## Testing

**Patterns:**

- Use `@QuarkusTest` annotation
- Name tests like `shouldDoSomething()`
- Use RESTAssured for HTTP tests
- Use Hamcrest matchers (`containsString`, `is`, `equalTo`)
- Helper methods with `@Transactional(TxType.REQUIRES_NEW)` for test data

**Example test structure:**

```java
@QuarkusTest
class ResourceTest
{
	@Inject
	Repository repository;

	@Test
	void shouldShowEntityInList()
	{
		deleteAllData();
		createEntity("Test");

		given()
			.when()
			.get("/resource")
			.then()
			.statusCode(200)
			.body(containsString("Test"));
	}

	@Transactional(TxType.REQUIRES_NEW)
	void deleteAllData()
	{
		repository.deleteAll();
	}
}
```

**Testing forms with CSRF:**

Form POST endpoints require CSRF tokens. For testing:

- Test GET endpoints and verify form elements are present
- Test service layer directly for business logic
- Download endpoints work without CSRF

## Frontend

This application uses [Carbon Design System v2](https://carbondesignsystem.com/) with [@carbon/web-components](https://web-components.carbondesignsystem.com/).

**Important:** Use actual Carbon web components, not custom HTML/CSS mimicking Carbon styles.

### Carbon Web Components

Carbon components are loaded via CDN in `main.html`:

```html
<script type="module" src="https://1.www.s81c.com/common/carbon/web-components/tag/v2/latest/button.min.js"></script>
<script type="module" src="https://1.www.s81c.com/common/carbon/web-components/tag/v2/latest/text-input.min.js"></script>
<!-- etc. -->
```

**Form components:**

```html
<!-- Text input -->
<cds-text-input
  label="Name"
  name="name"
  placeholder="z.B. Büromaterial"
  value="{document.name ?: ''}">
</cds-text-input>

<!-- Number input -->
<cds-number-input
  label="Bruttobetrag"
  name="total"
  step="0.01"
  required
  value="{document.total}">
</cds-number-input>

<!-- Select -->
<cds-select label="Währung" name="currencyCode">
  <cds-select-item value="EUR">EUR</cds-select-item>
  <cds-select-item value="USD">USD</cds-select-item>
</cds-select>

<!-- Date picker -->
<cds-date-picker>
  <cds-date-picker-input
    label="Belegdatum"
    name="documentDate"
    placeholder="dd.mm.yyyy">
  </cds-date-picker-input>
</cds-date-picker>

<!-- Checkbox -->
<cds-checkbox
  name="privatelyPaid"
  label-text="Privat bezahlt"
  {#if privatelyPaid}checked{/if}>
</cds-checkbox>

<!-- Textarea -->
<cds-textarea
  label="Beschreibung"
  name="description"
  rows="4"
  value="{description ?: ''}">
</cds-textarea>
```

**Buttons:**

**IMPORTANT:** Always use native `<button>` elements for form submissions and actions. Use `<cds-button>` ONLY for navigation links (with `href` attribute). The Carbon web components `<cds-button type="submit">` does not properly submit forms.

```html
<!-- Form submit button - USE NATIVE BUTTON -->
<button type="submit" class="cds-btn cds-btn-primary">
  Speichern
  <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor">...</svg>
</button>

<!-- Danger action button - USE NATIVE BUTTON -->
<button type="submit" class="cds-btn cds-btn-danger">
  Löschen
  <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor">...</svg>
</button>

<!-- Secondary action button - USE NATIVE BUTTON -->
<button type="button" class="cds-btn cds-btn-secondary">
  Aktion
</button>

<!-- Disabled button - USE NATIVE BUTTON -->
<button type="submit" class="cds-btn cds-btn-primary" disabled>
  Hochladen
</button>

<!-- Navigation link - USE CDS-BUTTON -->
<cds-button href="/belege" kind="secondary">
  Abbrechen
</cds-button>

<!-- Link to another page - USE CDS-BUTTON -->
<cds-button href="/transaktionen" kind="primary">
  Zur Übersicht
  <svg slot="icon">...</svg>
</cds-button>
```

**Button styling classes:**
- `.cds-btn` - Base button class (required)
- `.cds-btn-primary` - Primary action (purple background)
- `.cds-btn-secondary` - Secondary action
- `.cds-btn-danger` - Destructive action (red)

These styles are defined in `fuggs-components.css` and automatically styled to match Carbon Design System.

**Notifications:**

```html
<cds-actionable-notification
  kind="info"
  title="Ein Beleg wartet auf Ihre Prüfung!"
  subtitle="Die KI hat die Daten bereits extrahiert."
  low-contrast>
  <cds-actionable-notification-button slot="action">
    Jetzt prüfen
  </cds-actionable-notification-button>
</cds-actionable-notification>
```

**AI Labels:**

Carbon provides `<cds-ai-label>` for AI-generated content. Use `slot="label-text"` to add it to form fields:

```html
<cds-text-input
  label="Bezeichnung"
  name="name"
  value="{document.name ?: ''}">
  {#if document.name != null && document.analysisStatus.name == 'COMPLETED'}
  <cds-ai-label slot="label-text" size="mini" autoalign alignment="bottom-left">
    <div slot="body-text" class="ai-explainer">
      <p class="secondary">KI-erkannt</p>
      <p class="secondary bold">Bezeichnung</p>
      <p class="secondary">Automatisch aus dem Beleg extrahiert.</p>
    </div>
  </cds-ai-label>
  {/if}
</cds-text-input>
```

### Carbon UI Shell (Navigation)

The application uses Carbon UI Shell components for header and side navigation:

```html
<cds-header aria-label="Fuggs Buchhaltung">
  <cds-header-menu-button onclick="toggleSideNav()">
  </cds-header-menu-button>
  <cds-header-name href="/" prefix="">fuggs</cds-header-name>
  <cds-header-global-bar>
    <cds-header-global-action aria-label="Profil">
      <svg slot="icon">...</svg>
    </cds-header-global-action>
  </cds-header-global-bar>
</cds-header>

<cds-side-nav aria-label="Hauptnavigation" collapse-mode="fixed" expanded>
  <cds-side-nav-items>
    <cds-side-nav-link href="/" active>
      Dashboard
      <svg slot="title-icon">...</svg>
    </cds-side-nav-link>
    <cds-side-nav-divider></cds-side-nav-divider>
    <cds-side-nav-link href="/belege">
      Belege
      <svg slot="title-icon">...</svg>
    </cds-side-nav-link>
    <cds-side-nav-link href="#" disabled>
      Einstellungen <span class="bald-tag">Bald</span>
      <svg slot="title-icon">...</svg>
    </cds-side-nav-link>
  </cds-side-nav-items>
</cds-side-nav>
```

**CRITICAL: Carbon UI Shell Layout**

Carbon's `<cds-side-nav>` uses `position: fixed` and does NOT automatically offset content. You must manually add margin to your content container:

```css
/* Default: side nav in rail mode (collapsed, 48px wide) */
.app-container {
  margin-top: 48px; /* Height of cds-header */
  margin-left: 48px; /* Width of collapsed rail side-nav */
  transition: margin-left 0.11s cubic-bezier(0.2, 0, 1, 0.9);
}

/* When side nav is expanded (256px wide) - handled by JS */
body.side-nav-expanded .app-container {
  margin-left: 256px;
}

/* Responsive: side nav overlays content on mobile */
@media (max-width: 1056px) {
  .app-container {
    margin-left: 0 !important;
  }
}
```

Use JavaScript to track side-nav state and toggle body class:

```javascript
document.addEventListener('DOMContentLoaded', function() {
  var sideNav = document.querySelector('cds-side-nav');
  if (sideNav) {
    function updateLayout() {
      if (sideNav.expanded) {
        document.body.classList.add('side-nav-expanded');
      } else {
        document.body.classList.remove('side-nav-expanded');
      }
    }
    updateLayout();

    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.attributeName === 'expanded') {
          updateLayout();
        }
      });
    });
    observer.observe(sideNav, { attributes: true });
  }
});
```

**Collapse modes:**

- `collapse-mode="rail"` - Auto-collapses to icons when mouse leaves (annoying for main nav)
- `collapse-mode="fixed"` - Stays in user-selected state (recommended for main navigation)

### Charts

Use [Chart.js v4.4.0](https://www.chartjs.org/) for data visualization:

```html
<!-- In main.html -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

<!-- In template -->
<div style="max-width: 300px; margin: 0 auto;">
  <canvas id="myChart"></canvas>
</div>

{#moreScripts}
<script>
  document.addEventListener('DOMContentLoaded', function() {
    const ctx = document.getElementById('myChart');
    if (ctx) {
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Rechnungen', 'Quittungen', 'Sonstige'],
          datasets: [{
            data: [14, 7, 3],
            backgroundColor: ['#9058c5', '#24a148', '#f1c21b'], // Fuggs purple, green, yellow
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: { family: 'IBM Plex Sans', size: 14 }
              }
            }
          }
        }
      });
    }
  });
</script>
{/moreScripts}
```

**Use Fuggs brand colors:**
- **Fuggs Purple (Primary)**: `#9058c5` - Main brand color for buttons, links, interactive elements
- **Fuggs Purple Hover**: `#7d4ab5` - Darker shade for hover states
- **Fuggs Purple Active**: `#6a3d9f` - Even darker for active/pressed states
- **Fuggs Purple Light**: `#e6d9f2` - Light purple for backgrounds and accents
- Green 60: `#24a148` - Success/positive states
- Red 60: `#da1e28` - Error/danger states
- Yellow 30: `#f1c21b` - Warning states

**CSS Custom Properties:**
The application uses CSS custom properties for theming. Always use these variables instead of hardcoding colors:

```css
/* Fuggs Brand Colors (defined in fuggs-core.css) */
var(--fuggs-primary)        /* #9058c5 - Main purple */
var(--fuggs-primary-hover)  /* #7d4ab5 - Hover state */
var(--fuggs-primary-active) /* #6a3d9f - Active state */
var(--fuggs-primary-light)  /* #e6d9f2 - Light purple */

/* Carbon Design Tokens (mapped to Fuggs colors) */
var(--cds-interactive-01)      /* Primary interactive color */
var(--cds-border-interactive)  /* Interactive borders */
var(--cds-link-primary)        /* Link color */
var(--cds-link-primary-hover)  /* Link hover */
var(--cds-ui-focus)           /* Focus indicators */
```

**Chart.js colors:**
When creating charts, use the Fuggs purple as the primary color:

```javascript
backgroundColor: ['#9058c5', '#24a148', '#f1c21b'],  // Purple, Green, Yellow
```

### Custom CSS

Keep custom CSS minimal - Carbon handles most styling. Use Carbon design tokens:

```css
:root {
  --cds-spacing-03: 0.5rem;
  --cds-spacing-05: 1rem;
  --cds-spacing-07: 2rem;
  --cds-layer-01: #f4f4f4;
  --cds-layer-02: #ffffff;
  --cds-border-subtle-01: #e0e0e0;
  --cds-text-primary: #161616;
  --cds-text-secondary: #525252;
}
```

**Layout utilities:**

```css
.box {
  background-color: var(--cds-layer-02);
  border: 1px solid var(--cds-border-subtle-01);
  padding: var(--cds-spacing-07);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--cds-spacing-05);
}
```

### Qute Template Syntax with Carbon

**Conditional attributes:**

```html
<cds-side-nav-link href="/" {#if inject:vertxRequest.path == '/'}active{/if}>
  Dashboard
</cds-side-nav-link>

<cds-checkbox
  name="privatelyPaid"
  {#if privatelyPaid}checked{/if}>
</cds-checkbox>
```

**Dynamic values:**

Use Elvis operator `?:` for null safety (NOT safe navigation `?.` which is unsupported):

```html
<!-- CORRECT -->
<cds-text-input value="{document.name ?: ''}">
</cds-text-input>

<!-- WRONG - Qute doesn't support ?. operator -->
<cds-text-input value="{document?.name ?: ''}">
</cds-text-input>
```

**Loops with Carbon components:**

```html
{#for item in items}
<cds-select-item value="{item.id}">{item.name}</cds-select-item>
{/for}
```

### Loading States

For long-running requests, use Carbon loading components:

```html
<!-- Inline loading -->
<cds-inline-loading status="active"></cds-inline-loading>

<!-- Full page loading -->
<cds-loading></cds-loading>
```

See [Carbon loading patterns](https://carbondesignsystem.com/patterns/loading-pattern/) for best practices.

## Common Gotchas

1. **Formatter runs on validate phase** - Run `./mvnw formatter:format` before
   committing
2. **CheckedTemplate expressions** - No Java calls or `?.` operator in templates
3. **CSRF tokens** - All POST forms need `{#authenticityToken /}`
4. **.gitignore patterns** - Use `/tags` not `tags` to avoid ignoring
   `templates/tags/`
5. **S3 dependency** - Requires `url-connection-client` for HTTP transport
6. **Carbon UI Shell layout** - `<cds-side-nav>` is position fixed and does NOT
   auto-offset content. Must manually add margin-left to content container (see
   Frontend section)
7. **Qute section blocks** - `{#moreStyles}` must close with `{/moreStyles}`,
   not `{/if}`. Mismatched closing tags cause template parser errors
8. **Safe navigation operator** - Qute does NOT support `?.` operator. Use
   Elvis operator instead: `{object.property ?: ''}` not `{object?.property}`
9. **Carbon collapse modes** - Use `collapse-mode="fixed"` for main navigation,
   not `collapse-mode="rail"` which auto-collapses on mouse leave

## Git

- Use Gitmoji with the official emojis as Unicode in the form
  `✨ (scope): Short description` followed by a longer description or
  enumeration. 