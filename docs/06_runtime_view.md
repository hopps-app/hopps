# 6. Runtime View

This chapter describes the runtime behavior of the Hopps platform through key scenarios and sequence diagrams.

---

## Scenario 1: User Authentication Flow

### Overview
User authenticates with Keycloak and receives JWT token for API access.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant SPA as React SPA
    participant Keycloak
    participant Backend as Main Service
    participant DB as PostgreSQL

    User->>SPA: 1. Navigate to app
    SPA->>SPA: 2. Check for token
    SPA->>Keycloak: 3. Redirect to login page

    Keycloak->>User: 4. Display login form
    User->>Keycloak: 5. Submit credentials

    Keycloak->>Keycloak: 6. Validate credentials
    Keycloak->>SPA: 7. Redirect with auth code

    SPA->>Keycloak: 8. Exchange code for tokens
    Keycloak->>SPA: 9. Return access token (JWT) + refresh token

    SPA->>SPA: 10. Store tokens
    SPA->>Backend: 11. API request with JWT
    Note over SPA,Backend: Authorization: Bearer eyJhbG...

    Backend->>Backend: 12. Extract JWT from header
    Backend->>Keycloak: 13. Validate token signature (JWKS)
    Keycloak->>Backend: 14. Token valid + claims

    Backend->>DB: 15. Query member by email
    DB->>Backend: 16. Return member + organization
    Backend->>SPA: 17. API response

    SPA->>User: 18. Display dashboard
```

### Steps Description

1-3. **Initial Access:** User navigates to app, SPA checks for existing token, redirects to Keycloak if missing
4-5. **User Authentication:** Keycloak presents login form, user submits credentials
6-7. **Authorization Code:** Keycloak validates and returns authorization code
8-9. **Token Exchange:** SPA exchanges code for JWT access token (Authorization Code Flow with PKCE)
10. **Token Storage:** SPA stores tokens in memory (not localStorage for security)
11-14. **API Authentication:** Backend validates JWT signature using Keycloak's public keys (JWKS)
15-16. **User Context:** Backend retrieves user organization from database
17-18. **Response:** API returns data, SPA renders user interface

### Key Components
- **Keycloak:** Identity provider (OAuth2/OIDC)
- **JWT Token:** Contains user identity and claims
- **SecurityUtils:** Extracts user organization from token

---

## Scenario 2: Organization Creation (BPMN Workflow)

### Overview
New organization created through automated BPMN process including validation, Keycloak user creation, and persistence.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant SPA
    participant OrgResource as OrganizationResource
    participant BPMN as Kogito Engine
    participant Validate as ValidationDelegate
    participant CreateUser as CreateUserDelegate
    participant Persist as PersistDelegate
    participant KC as Keycloak Admin API
    participant DB as PostgreSQL
    participant Mail as Mail Service

    User->>SPA: 1. Fill organization form
    SPA->>OrgResource: 2. POST /organizations
    Note over SPA,OrgResource: NewOrganizationInput

    OrgResource->>BPMN: 3. Start NewOrganization process
    BPMN->>Validate: 4. Execute validation task

    Validate->>Validate: 5. Jakarta Bean Validation
    Validate->>DB: 6. Check slug uniqueness
    DB->>Validate: 7. Slug available

    Validate->>BPMN: 8. Validation passed

    BPMN->>CreateUser: 9. Create Keycloak user task
    CreateUser->>KC: 10. POST /admin/realms/hopps/users
    KC->>CreateUser: 11. User created (HTTP 201)
    CreateUser->>KC: 12. Send verification email
    CreateUser->>BPMN: 13. User ID returned

    BPMN->>Persist: 14. Persist organization task
    Persist->>DB: 15. INSERT organization
    Persist->>DB: 16. INSERT member
    Persist->>DB: 17. INSERT root bommel
    DB->>Persist: 18. Records created

    Persist->>BPMN: 19. Organization ID returned

    BPMN->>Mail: 20. Send welcome email (async)
    BPMN->>OrgResource: 21. Process complete

    OrgResource->>SPA: 22. HTTP 201 Created
    Note over OrgResource,SPA: CreateOrganizationResponse

    SPA->>User: 23. Show success + check email
```

### BPMN Process Diagram

```mermaid
graph TD
    Start([Start]) --> Input[Receive Input]
    Input --> Validate[Validation Delegate]

    Validate --> ValidGateway{Valid?}
    ValidGateway -->|No| Error[Return Error]
    ValidGateway -->|Yes| CreateUser[Create Keycloak User]

    CreateUser --> CreateSuccess{Success?}
    CreateSuccess -->|No| RollbackUser[Error Handler]
    CreateSuccess -->|Yes| Persist[Persist Organization]

    Persist --> PersistSuccess{Success?}
    PersistSuccess -->|No| DeleteUser[Cleanup Keycloak User]
    PersistSuccess -->|Yes| CreateRootBommel[Create Root Budget]

    CreateRootBommel --> SendEmail[Send Welcome Email]
    SendEmail --> End([End])

    Error --> End
    RollbackUser --> End
    DeleteUser --> End
```

### Delegates

**CreationValidationDelegate:**
- Validates input against Jakarta Bean Validation annotations
- Checks slug uniqueness in database
- Returns validation result to BPMN

**CreateUserInKeycloak:**
- Creates user in Keycloak via Admin REST API
- Sets username = email, enabled = true
- Triggers verification email
- Returns Keycloak user ID

**PersistOrganizationDelegate:**
- Creates Organization entity
- Creates Member entity for owner
- Links member to organization
- Creates root Bommel node
- All in single transaction

### Error Handling
- **Validation Fails:** Returns 400 Bad Request immediately
- **Keycloak Fails:** BPMN error handler, no database changes
- **Persistence Fails:** Attempts Keycloak user deletion (compensation)

---

## Scenario 3: Document Upload and AI Analysis

### Overview
User uploads document, which is stored in S3 and analyzed by AI service.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant SPA
    participant DocResource as DocumentResource
    participant S3Handler
    participant S3 as AWS S3
    participant SubmitService
    participant DocAI as Document AI
    participant Narrator as Fin Narrator
    participant ZugFerd
    participant Kafka
    participant DB as PostgreSQL

    User->>SPA: 1. Select file (invoice.pdf)
    SPA->>DocResource: 2. POST /documents/upload
    Note over SPA,DocResource: Request presigned URL

    DocResource->>S3Handler: 3. generatePresignedUrl()
    S3Handler->>S3Handler: 4. Create unique document key
    S3Handler->>S3: 5. Generate presigned URL (15 min)
    S3->>S3Handler: 6. Return presigned URL
    S3Handler->>DocResource: 7. URL + document key
    DocResource->>SPA: 8. Return presigned URL

    SPA->>S3: 9. PUT file directly to S3
    S3->>SPA: 10. Upload complete (HTTP 200)

    SPA->>DocResource: 11. POST /documents/submit
    Note over SPA,DocResource: documentKey, documentType

    DocResource->>SubmitService: 12. submit(documentKey, type)

    alt Document is ZugFerd Invoice
        SubmitService->>S3: 13a. Download PDF
        S3->>SubmitService: 14a. PDF file
        SubmitService->>ZugFerd: 15a. POST /parse
        ZugFerd->>SubmitService: 16a. Structured invoice data
    else Regular Document
        SubmitService->>S3: 13b. Download document
        S3->>SubmitService: 14b. Document file
        SubmitService->>DocAI: 15b. POST /analyze (multipart)
        DocAI->>DocAI: 16b. OCR + ML extraction
        DocAI->>SubmitService: 17b. Extracted data (JSON)
    end

    SubmitService->>Narrator: 18. POST /tag (description, amount)
    Narrator->>Narrator: 19. NLP analysis
    Narrator->>SubmitService: 20. Suggested tags + categories

    SubmitService->>DB: 21. INSERT document_metadata
    SubmitService->>DB: 22. INSERT transaction_record
    DB->>SubmitService: 23. Records saved

    SubmitService->>Kafka: 24. Publish DocumentProcessed event
    SubmitService->>DocResource: 25. Return result

    DocResource->>SPA: 26. HTTP 200 OK
    Note over DocResource,SPA: Extracted data + suggestions

    SPA->>User: 27. Show extracted data + review form
```

### Upload Strategy
**Direct Upload to S3:**
- Frontend requests presigned URL from backend
- Frontend uploads directly to S3 (no backend bottleneck)
- Backend generates presigned URL with 15-minute expiry
- S3 enforces security via temporary credentials

**Benefits:**
- Reduced backend load
- Faster uploads (no proxy)
- Scalable (S3 handles traffic)

### AI Analysis Flow

**ZugFerd Path:**
1. Detect ZugFerd format (embedded XML in PDF)
2. Parse XML structure
3. Extract structured invoice data
4. High confidence (machine-readable)

**Regular Document Path:**
1. OCR for scanned documents
2. ML models extract fields (amount, date, vendor)
3. Lower confidence (requires review)
4. User can correct extraction

### Kafka Event

```json
{
  "eventType": "DocumentProcessed",
  "documentId": "doc-123",
  "organizationId": "org-456",
  "processedAt": "2024-11-12T10:30:00Z",
  "extractedData": {
    "type": "INVOICE",
    "amount": 1234.56,
    "currency": "EUR",
    "date": "2024-11-10",
    "vendor": "Acme Corp"
  },
  "suggestedCategory": "IT Infrastructure",
  "confidence": 0.92
}
```

---

## Scenario 4: Bommel Tree Navigation

### Overview
User navigates hierarchical budget structure (Bommel tree).

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant SPA
    participant BommelResource
    participant BommelRepo as BommelRepository
    participant DB as PostgreSQL
    participant SecurityUtils

    User->>SPA: 1. View budget hierarchy
    SPA->>BommelResource: 2. GET /bommels
    Note over SPA,BommelResource: Authorization: Bearer JWT

    BommelResource->>SecurityUtils: 3. getUserOrganization(ctx)
    SecurityUtils->>DB: 4. Query member by email
    DB->>SecurityUtils: 5. Return member + org
    SecurityUtils->>BommelResource: 6. Organization

    BommelResource->>BommelRepo: 7. list(organization)
    BommelRepo->>DB: 8. SELECT * FROM bommel WHERE org_id = ?
    DB->>BommelRepo: 9. All bommels for org
    BommelRepo->>BommelResource: 10. List<Bommel>

    BommelResource->>SPA: 11. HTTP 200 OK (JSON array)
    SPA->>SPA: 12. Build tree structure
    SPA->>User: 13. Render tree UI

    User->>SPA: 14. Click bommel node
    SPA->>BommelResource: 15. GET /bommels/{id}/children

    BommelResource->>BommelRepo: 16. findChildren(id)
    BommelRepo->>DB: 17. SELECT * FROM bommel WHERE parent_id = ?
    DB->>BommelRepo: 18. Child bommels
    BommelRepo->>BommelResource: 19. List<Bommel>

    BommelResource->>SPA: 20. HTTP 200 OK
    SPA->>User: 21. Expand tree node

    User->>SPA: 22. Request parent chain
    SPA->>BommelResource: 23. GET /bommels/{id}/parents

    BommelResource->>BommelRepo: 24. getParents(id)
    BommelRepo->>DB: 25. WITH RECURSIVE parents AS (...)
    Note over BommelRepo,DB: Recursive CTE for ancestors

    DB->>BommelRepo: 26. Parent chain
    BommelRepo->>BommelResource: 27. List<TreeSearchBommel>

    BommelResource->>SPA: 28. HTTP 200 OK (breadcrumb)
    SPA->>User: 29. Display breadcrumb navigation
```

### Recursive Query

**Get Parents (Ancestors):**
```sql
WITH RECURSIVE parents AS (
    -- Base case: start with target bommel
    SELECT id, parent_id, name, 1 as level
    FROM bommel
    WHERE id = ?

    UNION ALL

    -- Recursive case: get parent of current node
    SELECT b.id, b.parent_id, b.name, p.level + 1
    FROM bommel b
    INNER JOIN parents p ON b.id = p.parent_id
)
SELECT * FROM parents ORDER BY level DESC;
```

**Example Result:**
```
Root Budget (level 3)
└── Marketing (level 2)
    └── Social Media (level 1)  ← Current bommel
```

**Get Children Recursively (Descendants):**
```sql
WITH RECURSIVE children AS (
    SELECT id, parent_id, name, 0 as depth
    FROM bommel
    WHERE id = ?

    UNION ALL

    SELECT b.id, b.parent_id, b.name, c.depth + 1
    FROM bommel b
    INNER JOIN children c ON b.parent_id = c.id
)
SELECT * FROM children WHERE id != ? ORDER BY depth;
```

---

## Scenario 5: Move Bommel with Cycle Detection

### Overview
User moves bommel node to new parent, system prevents circular references.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant SPA
    participant BommelResource
    participant BommelRepo
    participant DB

    User->>SPA: 1. Drag bommel to new parent
    SPA->>BommelResource: 2. POST /bommels/{id}/move
    Note over SPA,BommelResource: {newParentId: 123}

    BommelResource->>BommelRepo: 3. moveBommel(id, newParentId)

    BommelRepo->>DB: 4. Find source bommel
    DB->>BommelRepo: 5. Bommel entity

    BommelRepo->>BommelRepo: 6. ensureNoCycleFromBommel(source, newParent)

    BommelRepo->>DB: 7. Get all descendants of source
    Note over BommelRepo,DB: Recursive query

    DB->>BommelRepo: 8. Descendant IDs [5, 12, 18]

    BommelRepo->>BommelRepo: 9. Check if newParentId in descendants
    alt Cycle Detected
        BommelRepo->>BommelResource: 10a. Throw IllegalArgumentException
        BommelResource->>SPA: 11a. HTTP 400 Bad Request
        SPA->>User: 12a. Error: "Cannot move - would create cycle"
    else No Cycle
        BommelRepo->>DB: 10b. UPDATE bommel SET parent_id = ? WHERE id = ?
        DB->>BommelRepo: 11b. Update successful
        BommelRepo->>BommelRepo: 12b. ensureConsistency()
        BommelRepo->>BommelResource: 13b. Return updated bommel
        BommelResource->>SPA: 14b. HTTP 200 OK
        SPA->>SPA: 15b. Update tree UI
        SPA->>User: 16b. Success animation
    end
```

### Cycle Detection Algorithm

```java
public void ensureNoCycleFromBommel(Bommel source, Bommel newParent) {
    if (newParent == null) {
        return; // Moving to root is always safe
    }

    // Get all descendants of source bommel
    Set<Long> descendants = getAllChildrenIds(source.id);

    // Check if new parent is a descendant
    if (descendants.contains(newParent.id)) {
        throw new IllegalArgumentException(
            "Cannot move bommel: would create a cycle"
        );
    }
}
```

**Example:**
```
Root
├── A
│   ├── B
│   │   └── C  ← Try to move A here
│   └── D
└── E
```

**Result:** ❌ Rejected - A cannot be child of C because C is already descendant of A

---

## Scenario 6: Category Assignment to Transaction

### Overview
User assigns category to transaction record.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant SPA
    participant TxResource as TransactionRecordResource
    participant TxRepo as TransactionRecordRepository
    participant CategoryRepo
    participant DB
    participant SecurityUtils

    User->>SPA: 1. Select transaction
    User->>SPA: 2. Choose category
    SPA->>TxResource: 3. PUT /transaction-records/{id}
    Note over SPA,TxResource: {categoryId: 456}

    TxResource->>SecurityUtils: 4. getUserOrganization(ctx)
    SecurityUtils->>TxResource: 5. Organization

    TxResource->>TxRepo: 6. findById(id)
    TxRepo->>DB: 7. SELECT * FROM transaction_record WHERE id = ?
    DB->>TxRepo: 8. TransactionRecord entity
    TxRepo->>TxResource: 9. Transaction

    TxResource->>TxResource: 10. Verify transaction belongs to org
    alt Transaction not in org
        TxResource->>SPA: 11a. HTTP 403 Forbidden
    else Transaction in org
        TxResource->>CategoryRepo: 11b. findById(categoryId)
        CategoryRepo->>DB: 12b. SELECT * FROM category WHERE id = ?
        DB->>CategoryRepo: 13b. Category entity
        CategoryRepo->>TxResource: 14b. Category

        TxResource->>TxResource: 15b. Verify category belongs to org
        TxResource->>TxResource: 16b. transaction.setCategory(category)
        TxResource->>TxRepo: 17b. persist(transaction)
        TxRepo->>DB: 18b. UPDATE transaction_record SET category_id = ?
        DB->>TxRepo: 19b. Update successful

        TxRepo->>TxResource: 20b. Updated transaction
        TxResource->>SPA: 21b. HTTP 200 OK
        SPA->>User: 22b. Show category badge on transaction
    end
```

### Multi-Tenant Security
- Every operation validates organization ownership
- Prevents cross-organization data access
- SecurityUtils extracts user organization from JWT
- All queries filtered by organization ID

---

## Scenario 7: Transaction Reconciliation

### Overview
Match bank transaction with document and categorize.

### Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant SPA
    participant TxResource
    participant DocResource
    participant DB

    User->>SPA: 1. Import bank statement CSV
    SPA->>TxResource: 2. POST /transaction-records/import
    Note over SPA,TxResource: CSV data

    TxResource->>TxResource: 3. Parse CSV
    TxResource->>DB: 4. Batch INSERT transactions
    DB->>TxResource: 5. Transactions created

    TxResource->>SPA: 6. HTTP 201 Created
    SPA->>User: 7. Show unmatched transactions

    User->>SPA: 8. Select transaction
    User->>SPA: 9. Select matching document
    SPA->>TxResource: 10. PUT /transaction-records/{id}/link-document

    TxResource->>DB: 11. UPDATE transaction SET document_key = ?
    DB->>TxResource: 12. Updated

    TxResource->>DocResource: 13. GET /documents/metadata?key={key}
    DocResource->>DB: 14. SELECT document metadata
    DB->>DocResource: 15. Document with extracted data
    DocResource->>TxResource: 16. Document metadata

    TxResource->>TxResource: 17. Copy category from document
    TxResource->>DB: 18. UPDATE transaction category
    DB->>TxResource: 19. Updated

    TxResource->>SPA: 20. HTTP 200 OK (reconciled)
    SPA->>User: 21. Show matched transaction (green badge)
```

---

## Performance Considerations

### Database Query Optimization

**Bommel Tree Queries:**
- Recursive CTEs for ancestor/descendant queries
- Indexed on `parent_id` for fast tree traversal
- Materialized path pattern (future optimization)

**Organization Scoping:**
- All queries filtered by `organization_id`
- Index on foreign keys
- Prevents full table scans

**Caching Strategy:**
- Keycloak JWKS cached for 1 hour
- User organization cached in request scope
- Category list cached for 5 minutes

---

## Error Handling Patterns

### Transactional Boundaries

```java
@Transactional
public void createOrganization(Input input) {
    // All database operations in single transaction
    // Rollback on any exception
}
```

### BPMN Error Handling

```xml
<bpmn:serviceTask id="createUser" implementation="Java">
    <bpmn:extensionElements>
        <errorEventDefinition errorRef="UserCreationError"/>
    </bpmn:extensionElements>
</bpmn:serviceTask>
```

### Retry Logic

```yaml
# REST client retry configuration
quarkus:
  rest-client:
    document-analyze:
      max-attempts: 3
      delay: 1s
      max-delay: 5s
```

---

## Summary

The Hopps platform runtime behavior demonstrates:

1. **OAuth2/OIDC Authentication** with Keycloak and JWT
2. **BPMN Orchestration** for complex workflows
3. **Event-Driven Processing** with Kafka
4. **Multi-Tenant Security** with organization scoping
5. **Direct S3 Upload** for performance
6. **Recursive Queries** for tree structures
7. **Cycle Detection** for data integrity
8. **Transactional Consistency** across operations

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Active
