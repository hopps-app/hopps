# 3. System Scope and Context

This chapter describes the environment and context in which the Hopps platform operates, including external systems, interfaces, and communication partners.

---

## Business Context

The Hopps platform operates within the ecosystem of German association management, interacting with various external entities and systems.

### Context Diagram

```mermaid
C4Context
    title Hopps Platform - Business Context

    Person(owner, "Organization Owner", "Creates and manages association")
    Person(admin, "Administrator", "Manages members and budgets")
    Person(finance, "Finance Manager", "Processes documents and transactions")
    Person(member, "Member", "Views organization information")

    System(hopps, "Hopps Platform", "Association management platform")

    System_Ext(keycloak, "Keycloak", "Identity & Access Management")
    System_Ext(email, "Email Service", "Sends notifications and invitations")
    System_Ext(s3, "AWS S3", "Document storage")
    System_Ext(ai, "Document AI", "Analyzes documents")
    System_Ext(narrator, "Financial Narrator", "Semantic tagging of transactions")
    System_Ext(zugferd, "ZugFerd Service", "Invoice parsing")
    System_Ext(bank, "Bank Systems", "Future: Bank statement import")

    Rel(owner, hopps, "Creates organizations, manages settings")
    Rel(admin, hopps, "Manages members, budgets, categories")
    Rel(finance, hopps, "Uploads documents, records transactions")
    Rel(member, hopps, "Views budget, documents")

    Rel(hopps, keycloak, "Authenticates users, manages identities")
    Rel(hopps, email, "Sends member invitations, notifications")
    Rel(hopps, s3, "Stores/retrieves documents")
    Rel(hopps, ai, "Sends documents for AI analysis")
    Rel(hopps, narrator, "Gets semantic tags for transactions")
    Rel(hopps, zugferd, "Parses ZugFerd invoices")
    Rel(hopps, bank, "Future: Imports bank statements")

    UpdateLayoutConfig($c4ShapeInRow="3", $c4BoundaryInRow="2")
```

---

## Actors and External Systems

### Human Actors

#### Organization Owner
**Description:** Founder or legal representative of the association who creates the organization in Hopps.

**Interactions:**
- Creates new organization through registration workflow
- Becomes initial administrator
- Keycloak account created automatically
- Configures organization settings

**Use Cases:**
- Register new organization
- Invite initial administrators
- Configure organization profile
- Set up initial budget structure

---

#### Administrator
**Description:** Assigned staff member with administrative privileges.

**Interactions:**
- Manages members (invite, activate, deactivate)
- Creates and manages budget structures (Bommel tree)
- Defines expense categories
- Reviews financial transactions

**Use Cases:**
- Invite new members
- Assign roles and permissions
- Create/modify budget nodes
- Define categories
- Generate reports

---

#### Finance Manager
**Description:** User responsible for financial document processing and transaction recording.

**Interactions:**
- Uploads invoices, receipts, and other financial documents
- Reviews AI-extracted document data
- Records manual transactions
- Links transactions to categories and budget nodes

**Use Cases:**
- Upload documents (drag-and-drop, mobile camera)
- Review and correct AI analysis results
- Record cash transactions
- Categorize expenses
- Export financial data

---

#### Member
**Description:** Regular member of the organization with view-only or limited permissions.

**Interactions:**
- Views organization information
- Accesses budget structures
- Views assigned documents
- Updates personal profile

**Use Cases:**
- View organization budget
- Check transaction history (if permitted)
- Update contact information
- Mobile app access

---

### External Systems

#### Keycloak (Identity Provider)
**Type:** External System (Self-Hosted)
**Purpose:** Centralized identity and access management

**Interactions:**
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Hopps
    participant Keycloak

    User->>Frontend: Login
    Frontend->>Keycloak: Redirect to login page
    Keycloak->>User: Present login form
    User->>Keycloak: Submit credentials
    Keycloak->>Keycloak: Authenticate
    Keycloak->>Frontend: Return JWT token
    Frontend->>Hopps: API request with JWT
    Hopps->>Keycloak: Validate token (JWKS)
    Keycloak->>Hopps: Token valid
    Hopps->>Frontend: Response
```

**Interface:**
- **Protocol:** OAuth2/OIDC
- **Authentication:** Authorization Code Flow with PKCE
- **Token Format:** JWT (JSON Web Token)
- **Admin API:** REST API for user provisioning

**Configuration:**
```yaml
quarkus:
  oidc:
    auth-server-url: https://keycloak.hopps.app/realms/hopps
    client-id: hopps-backend
    credentials:
      secret: ${KEYCLOAK_CLIENT_SECRET}
```

**Data Exchange:**
- **From Hopps:** User creation requests (organization owner)
- **To Hopps:** User identity, roles, JWT tokens

---

#### Email Service (Mailservice)
**Type:** Internal Microservice
**Purpose:** Send transactional emails and notifications

**Interactions:**
- Member invitation emails
- Password reset emails
- Transaction notifications
- Report generation alerts

**Interface:**
- **Protocol:** REST API
- **Message Format:** JSON
- **Async Communication:** Kafka events trigger emails

**Example Request:**
```json
POST /emails/send
{
  "to": "member@example.com",
  "subject": "Invitation to Join Organization",
  "template": "member-invitation",
  "variables": {
    "organizationName": "Example Verein e.V.",
    "inviteLink": "https://app.hopps.app/invite/abc123"
  }
}
```

---

#### AWS S3 (Document Storage)
**Type:** External Cloud Service
**Purpose:** Scalable object storage for documents

**Interactions:**
- Upload documents (invoices, receipts, contracts)
- Download documents via presigned URLs
- Lifecycle policies for archival
- MinIO for local development (S3-compatible)

**Interface:**
- **Protocol:** AWS S3 API (HTTP REST)
- **Authentication:** AWS IAM credentials / Access Keys
- **Presigned URLs:** Temporary URLs for secure frontend access

**Bucket Structure:**
```
s3://hopps-documents/
├── {organizationId}/
│   ├── invoices/
│   │   └── {documentId}.pdf
│   ├── receipts/
│   │   └── {documentId}.jpg
│   └── contracts/
│       └── {documentId}.pdf
```

**S3Handler Implementation:**
```java
@ApplicationScoped
public class S3Handler {
    @Inject S3Client s3;

    public String uploadDocument(String orgId, String docId, InputStream data) {
        String key = String.format("%s/documents/%s", orgId, docId);
        s3.putObject(request, RequestBody.fromInputStream(data, length));
        return generatePresignedUrl(key);
    }
}
```

---

#### Document AI Service
**Type:** Internal Microservice (app.hopps.az-document-ai)
**Purpose:** AI-powered document analysis and data extraction

**Interactions:**
- Analyze uploaded documents (invoices, receipts)
- Extract structured data (amounts, dates, vendors)
- OCR for scanned documents
- Classification (invoice vs receipt)

**Interface:**
- **Protocol:** REST API
- **Request:** Multipart form data (document file)
- **Response:** JSON with extracted fields

**Request Example:**
```bash
POST /analyze
Content-Type: multipart/form-data

--boundary
Content-Disposition: form-data; name="file"; filename="invoice.pdf"
Content-Type: application/pdf

[binary PDF data]
```

**Response Example:**
```json
{
  "documentType": "INVOICE",
  "extractedData": {
    "invoiceNumber": "RE-2024-001",
    "date": "2024-11-12",
    "totalAmount": 1234.56,
    "currency": "EUR",
    "vendor": {
      "name": "Acme Corp",
      "taxId": "DE123456789"
    },
    "lineItems": [
      {
        "description": "Consulting Services",
        "amount": 1000.00,
        "vat": 234.56
      }
    ]
  },
  "confidence": 0.95
}
```

---

#### Financial Narrator Service
**Type:** Internal Microservice (app.hopps.fin-narrator)
**Purpose:** Semantic tagging and categorization of transactions using AI

**Interactions:**
- Analyzes transaction descriptions
- Suggests categories and tags
- Learns from user corrections
- Improves accuracy over time

**Interface:**
- **Protocol:** REST API
- **Request:** Transaction description, amount
- **Response:** Suggested tags and categories

**Example:**
```json
POST /tag
{
  "description": "Amazon Web Services - Cloud Hosting",
  "amount": 150.00,
  "organizationContext": "tech-startup"
}

Response:
{
  "suggestedCategory": "IT Infrastructure",
  "tags": ["cloud", "hosting", "recurring"],
  "confidence": 0.88,
  "alternatives": [
    {"category": "Server Costs", "confidence": 0.75}
  ]
}
```

---

#### ZugFerd Service
**Type:** Internal Microservice (app.hopps.zugferd)
**Purpose:** Parse ZugFerd electronic invoices

**Interactions:**
- Extract structured invoice data from ZugFerd XML
- Support ZugFerd 1.0 and 2.0 formats
- Validate invoice structure
- Map to Hopps data model

**Interface:**
- **Protocol:** REST API
- **Input:** PDF with embedded ZugFerd XML
- **Output:** Structured invoice data

**ZugFerd Format:**
ZugFerd is a German standard for electronic invoicing combining PDF (human-readable) with XML (machine-readable) data.

**Example:**
```xml
<!-- Embedded in PDF -->
<rsm:CrossIndustryInvoice>
  <rsm:ExchangedDocument>
    <ram:ID>RE-2024-001</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>2024-11-12</ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:TaxBasisTotalAmount>1000.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount>190.00</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>1190.00</ram:GrandTotalAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
```

---

#### Bank Systems (Future)
**Type:** External System (Planned)
**Purpose:** Import bank statements and reconcile transactions

**Planned Interactions:**
- Import bank statements (CSV, MT940)
- Automatic transaction matching
- Reconciliation workflow
- PSD2 API integration (European banking API standard)

**Standards:**
- **MT940:** SWIFT standard for bank statements
- **PSD2:** European payment services directive API
- **EBICS:** Electronic Banking Internet Communication Standard (German banks)

---

## Technical Context

### Communication Protocols and Data Formats

```mermaid
graph TD
    subgraph Frontend
        SPA[React SPA]
        Mobile[React Native]
    end

    subgraph Backend Services
        Main[app.hopps.org<br/>Main Service]
        DocAI[Document AI<br/>Analysis]
        Narrator[Financial Narrator<br/>Tagging]
        ZugFerd[ZugFerd<br/>Parser]
        Mail[Mail Service<br/>Notifications]
    end

    subgraph External Services
        KC[Keycloak<br/>Auth]
        S3[AWS S3<br/>Storage]
        DB[(PostgreSQL<br/>Database)]
        Kafka[Kafka<br/>Message Broker]
    end

    SPA -->|HTTPS/REST<br/>JSON + JWT| Main
    Mobile -->|HTTPS/REST<br/>JSON + JWT| Main
    SPA -->|OAuth2/OIDC| KC
    Mobile -->|OAuth2/OIDC| KC

    Main -->|REST/JSON| DocAI
    Main -->|REST/JSON| Narrator
    Main -->|REST/JSON| ZugFerd
    Main -->|REST/JSON| Mail
    Main -->|HTTPS/S3 API| S3
    Main -->|JDBC/SQL| DB
    Main -->|Kafka Protocol| Kafka

    Main -->|Keycloak Admin API| KC
```

---

### Interface Specifications

#### IF-1: Frontend to Backend API

**Protocol:** HTTPS/REST
**Authentication:** Bearer JWT token in Authorization header
**Data Format:** JSON
**API Style:** RESTful with resource-based URLs

**Example Request:**
```http
GET /organizations/123 HTTP/1.1
Host: api.hopps.app
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

**Example Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 123,
  "name": "Example Verein e.V.",
  "slug": "example-verein",
  "createdAt": "2024-01-15T10:30:00Z",
  "memberCount": 45
}
```

**OpenAPI Specification:**
- Available at: `/q/openapi`
- Swagger UI at: `/q/swagger-ui`
- TypeScript client generated from OpenAPI spec

---

#### IF-2: Backend to Keycloak

**Protocol:** HTTPS/REST (OAuth2 + Admin API)
**Authentication:** Client credentials (backend service)
**Data Format:** JSON

**Token Validation:**
```yaml
# Quarkus validates JWT tokens using JWKS from Keycloak
quarkus.oidc.jwks-path: ${keycloak.url}/realms/hopps/protocol/openid-connect/certs
```

**User Creation (Admin API):**
```java
@Inject
@RestClient
Keycloak keycloakAdmin;

public void createUser(String email, String firstName, String lastName) {
    UserRepresentation user = new UserRepresentation();
    user.setEmail(email);
    user.setUsername(email);
    user.setFirstName(firstName);
    user.setLastName(lastName);
    user.setEnabled(true);

    keycloakAdmin.realm("hopps").users().create(user);
}
```

---

#### IF-3: Backend to AWS S3

**Protocol:** AWS S3 REST API (HTTPS)
**Authentication:** AWS Signature Version 4
**SDK:** Quarkus Amazon S3 extension

**Configuration:**
```yaml
quarkus:
  s3:
    endpoint-override: http://localhost:9000  # MinIO for local dev
    aws:
      region: eu-central-1
      credentials:
        type: static
        static-provider:
          access-key-id: ${AWS_ACCESS_KEY}
          secret-access-key: ${AWS_SECRET_KEY}
```

**Upload Example:**
```java
@Inject
S3Client s3;

public void upload(String bucket, String key, byte[] data) {
    s3.putObject(
        PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .build(),
        RequestBody.fromBytes(data)
    );
}
```

---

#### IF-4: Backend to PostgreSQL

**Protocol:** JDBC over TCP
**Driver:** PostgreSQL JDBC Driver
**ORM:** Hibernate ORM with Panache

**Configuration:**
```yaml
quarkus:
  datasource:
    db-kind: postgresql
    username: hopps
    password: ${DB_PASSWORD}
    jdbc:
      url: jdbc:postgresql://localhost:5432/hopps
      max-size: 16
```

**Data Access Pattern:**
```java
@ApplicationScoped
public class OrganizationRepository implements PanacheRepository<Organization> {
    public Organization findBySlug(String slug) {
        return find("slug", slug).firstResult();
    }
}
```

---

#### IF-5: Backend to Kafka

**Protocol:** Kafka Protocol (TCP)
**Library:** Quarkus Reactive Messaging with Kafka connector
**Data Format:** JSON (serialized as String)

**Configuration:**
```yaml
mp:
  messaging:
    outgoing:
      documents:
        connector: smallrye-kafka
        topic: documents
        value.serializer: org.apache.kafka.common.serialization.StringSerializer
```

**Producer Example:**
```java
@Channel("documents")
Emitter<String> documentEmitter;

public void publishDocumentEvent(DocumentEvent event) {
    String json = objectMapper.writeValueAsString(event);
    documentEmitter.send(json);
}
```

---

#### IF-6: Service-to-Service Communication

**Protocol:** HTTPS/REST
**Authentication:** Internal service accounts or mutual TLS
**Data Format:** JSON

**Example: Main Service → Document AI:**
```java
@RegisterRestClient(configKey = "document-analyze")
public interface DocumentAnalyzeClient {
    @POST
    @Path("/analyze")
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    DocumentAnalysisResult analyze(@MultipartForm FileUpload file);
}
```

**Configuration:**
```yaml
quarkus:
  rest-client:
    document-analyze:
      url: http://document-ai:8080
      scope: jakarta.inject.Singleton
```

---

## External Interface Requirements

### Security Requirements
- **TLS 1.3:** All external HTTPS communication
- **JWT Validation:** Signature verification using Keycloak JWKS
- **API Rate Limiting:** Prevent abuse (future)
- **CORS:** Configured for SPA domain

### Performance Requirements
- **API Response Time:** < 200ms for 95% of requests
- **Document Upload:** Support files up to 50MB
- **Presigned URL Expiry:** 15 minutes for S3 uploads
- **Connection Timeout:** 30 seconds for external services

### Data Format Standards
- **Date/Time:** ISO 8601 format (2024-11-12T10:30:00Z)
- **Currency:** ISO 4217 codes (EUR, USD)
- **Country Codes:** ISO 3166-1 alpha-2 (DE, AT, CH)
- **Language:** ISO 639-1 codes (de, en)

---

## System Boundaries

### In Scope
- All business logic within Hopps backend services
- User authentication via Keycloak integration
- Document storage and retrieval via S3
- AI-powered document analysis
- Frontend applications (SPA and mobile)

### Out of Scope
- Keycloak infrastructure management (external responsibility)
- AWS S3 infrastructure (managed service)
- Email delivery infrastructure (SMTP relay)
- Network infrastructure (Kubernetes cluster)
- Browser/mobile OS implementation

### Interface Ownership

| Interface | Owner | Consumer | Protocol |
|-----------|-------|----------|----------|
| Main REST API | Hopps Backend Team | Frontend Team | HTTPS/REST |
| Keycloak OIDC | Keycloak Admins | All Services | OAuth2/OIDC |
| S3 Storage | DevOps/Cloud Team | Backend Services | S3 API |
| Document AI API | AI Team | Main Service | REST |
| Kafka Topics | Backend Team | All Services | Kafka |

---

## Context Evolution

### Current State (v1.0)
- Basic organization and member management
- Document upload with AI analysis
- Bommel tree structures
- Keycloak authentication

### Planned (v1.1)
- Bank statement import
- Advanced reporting
- Mobile app feature parity
- OpenFGA authorization

### Future Vision (v2.0)
- Multi-language support
- Public APIs for third-party integrations
- Event management module
- Fundraising/donation module
- Accounting software integration (DATEV)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Active
