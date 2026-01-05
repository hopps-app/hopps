# Vertical Slice Architecture - Implementation Plan

**Architecture:** Vertical Slice Architecture
**Framework:** Quarkus (Java)
**Date:** 2025-11-12

---

## What is Vertical Slice Architecture?

Vertical Slice Architecture organizes code by **complete business capabilities** rather than technical layers. Each "slice" contains everything needed for that feature:

- ✅ **High Cohesion**: All code for a feature lives together
- ✅ **Low Coupling**: Slices are independent
- ✅ **Easy to understand**: Find all related code in one place
- ✅ **Pragmatic**: Less ceremony than strict layered architectures

### Key Principle
> "Each slice is a vertical cut through the entire application stack for a specific business capability"

---

## Proposed Structure

```
backend/app.hopps.org/src/main/java/app/hopps/
│
├── shared/                                 # Shared infrastructure only
│   ├── security/
│   │   └── SecurityUtils.java            # Extract getUserOrganization()
│   ├── filter/
│   │   └── KogitoEndpointFilter.java     # Unified filter
│   ├── validation/
│   │   ├── ValidationUtils.java
│   │   └── NonUniqueConstraintViolation.java
│   └── infrastructure/
│       └── storage/
│           └── S3Handler.java
│
├── organization/                          # SLICE: Organization management
│   ├── api/
│   │   └── OrganizationResource.java
│   ├── domain/
│   │   ├── Organization.java
│   │   └── Address.java                  # Embedded entity
│   ├── repository/
│   │   └── OrganizationRepository.java
│   ├── service/
│   │   ├── OrganizationService.java
│   │   └── delegate/
│   │       ├── PersistOrganizationDelegate.java
│   │       ├── CreationValidationDelegate.java
│   │       └── CreateUserInKeycloak.java
│   └── model/
│       ├── CreateOrganizationRequest.java
│       ├── UpdateOrganizationRequest.java
│       ├── OrganizationResponse.java
│       └── OwnerInput.java
│
├── bommel/                                # SLICE: Bommel tree management
│   ├── api/
│   │   └── BommelResource.java
│   ├── domain/
│   │   ├── Bommel.java
│   │   └── TreeSearchBommel.java
│   ├── repository/
│   │   └── BommelRepository.java
│   ├── service/
│   │   ├── BommelTreeService.java
│   │   └── BommelValidator.java
│   └── model/
│       ├── BommelInput.java
│       ├── BommelTreeResponse.java
│       └── MoveBommelRequest.java
│
├── category/                              # SLICE: Category management
│   ├── api/
│   │   └── CategoryResource.java
│   ├── domain/
│   │   └── Category.java
│   ├── repository/
│   │   └── CategoryRepository.java
│   ├── service/
│   │   └── CategoryService.java
│   └── model/
│       ├── CategoryInput.java
│       └── CategoryResponse.java
│
├── member/                                # SLICE: Member management
│   ├── api/
│   │   └── MemberResource.java
│   ├── domain/
│   │   └── Member.java
│   ├── repository/
│   │   └── MemberRepository.java
│   ├── service/
│   │   └── MemberService.java
│   └── model/
│       ├── MemberInput.java
│       └── MemberResponse.java
│
├── document/                              # SLICE: Document processing
│   ├── api/
│   │   └── DocumentResource.java
│   ├── domain/
│   │   ├── DocumentType.java
│   │   ├── DocumentData.java
│   │   ├── InvoiceData.java
│   │   └── ReceiptData.java
│   ├── service/
│   │   ├── DocumentService.java
│   │   └── DocumentSubmitService.java
│   ├── client/
│   │   ├── DocumentAnalyzeClient.java
│   │   ├── FinNarratorClient.java
│   │   ├── ZugFerdClient.java
│   │   └── dto/
│   │       └── BommelDto.java           # Renamed from Bommel
│   ├── messaging/
│   │   └── DocumentProducer.java
│   └── model/
│       ├── UploadDocumentRequest.java
│       └── DocumentResponse.java
│
└── transaction/                           # SLICE: Transaction recording
    ├── api/
    │   └── TransactionRecordResource.java
    ├── domain/
    │   ├── TransactionRecord.java
    │   └── TradeParty.java
    ├── repository/
    │   └── TransactionRecordRepository.java
    ├── service/
    │   └── TransactionRecordService.java
    └── model/
        ├── TransactionRecordInput.java
        └── TransactionRecordResponse.java
```

---

## Vertical Slices Identified

### 1. **organization** - Organization Management
**Business Capability:** Complete organization lifecycle

**Includes:**
- Create/update/delete organizations
- Organization validation
- Member listing for organization
- Keycloak user creation
- BPMN process orchestration

**Current files:**
- `org.rest.OrganizationResource`
- `org.jpa.Organization`
- `org.jpa.OrganizationRepository`
- `org.delegates.*`

---

### 2. **bommel** - Bommel Tree Management
**Business Capability:** Hierarchical tree structure operations

**Includes:**
- Create/update/delete bommel nodes
- Tree navigation (parents, children, siblings)
- Move bommel with cycle detection
- Recursive tree queries

**Current files:**
- `org.rest.BommelResource`
- `org.jpa.Bommel`
- `org.jpa.BommelRepository`
- `org.jpa.TreeSearchBommel`

---

### 3. **category** - Category Management
**Business Capability:** Category CRUD within organization context

**Includes:**
- Create/update/delete categories
- Organization-scoped categories
- Category validation

**Current files:**
- `org.rest.CategoryResource`
- `org.jpa.Category`
- `org.jpa.CategoryRepository`

---

### 4. **member** - Member Management
**Business Capability:** Member operations and validation

**Includes:**
- Member validation
- Member lookup
- (Future: Full CRUD operations)

**Current files:**
- `org.rest.MemberResource`
- `org.jpa.Member`
- `org.jpa.MemberRepository`

---

### 5. **document** - Document Processing
**Business Capability:** Document upload, analysis, and submission

**Includes:**
- Document upload to S3
- Document analysis (external API)
- Financial narrative tagging
- ZugFerd invoice processing
- Document submission workflow
- Kafka event publishing

**Current files:**
- `fin.endpoint.DocumentResource`
- `fin.bpmn.SubmitService`
- `fin.client.*`
- `fin.kafka.DocumentProducer`
- `fin.model.*`

---

### 6. **transaction** - Transaction Recording
**Business Capability:** Transaction record management

**Includes:**
- Create/update/delete transaction records
- Trade party management
- Transaction querying

**Current files:**
- `fin.endpoint.TransactionRecordResource`
- `fin.jpa.entities.TransactionRecord`
- `fin.jpa.entities.TradeParty`
- `fin.jpa.TransactionRecordRepository`

---

## Benefits

### 1. **Feature Cohesion**
Everything related to "bommel management" is in `bommel/`:
```
bommel/
├── api/BommelResource.java           # REST endpoints
├── domain/Bommel.java                # Entity
├── repository/BommelRepository.java   # Data access
├── service/BommelTreeService.java    # Business logic
└── model/BommelInput.java            # DTOs
```

### 2. **Independent Deployment**
Each slice can evolve independently:
- Add features to `document/` without affecting `organization/`
- Different teams can own different slices

### 3. **Easier Navigation**
Developers know exactly where to go:
- Working on categories? → `category/`
- Working on documents? → `document/`

### 4. **Reduced Coupling**
Slices only share through `shared/`:
- No `organization/` importing from `document/`
- Clear boundaries

### 5. **Testing Simplicity**
Test entire slice in isolation:
```java
@QuarkusTest
class OrganizationSliceTest {
    // Test complete organization feature
}
```

---

## Migration Mapping

| Current Location | Vertical Slice Location |
|-----------------|------------------------|
| `org.jpa.Organization` | `organization/domain/Organization.java` |
| `org.jpa.OrganizationRepository` | `organization/repository/OrganizationRepository.java` |
| `org.rest.OrganizationResource` | `organization/api/OrganizationResource.java` |
| `org.rest.model.OrganizationInput` | `organization/model/CreateOrganizationRequest.java` |
| `org.delegates.*` | `organization/service/delegate/*` |
| `org.jpa.Bommel` | `bommel/domain/Bommel.java` |
| `org.jpa.BommelRepository` | `bommel/repository/BommelRepository.java` |
| `org.rest.BommelResource` | `bommel/api/BommelResource.java` |
| `org.rest.model.BommelInput` | `bommel/model/BommelInput.java` |
| `org.jpa.Category` | `category/domain/Category.java` |
| `org.rest.CategoryResource` | `category/api/CategoryResource.java` |
| `org.jpa.Member` | `member/domain/Member.java` |
| `org.rest.MemberResource` | `member/api/MemberResource.java` |
| `fin.jpa.entities.TransactionRecord` | `transaction/domain/TransactionRecord.java` |
| `fin.endpoint.TransactionRecordResource` | `transaction/api/TransactionRecordResource.java` |
| `fin.endpoint.DocumentResource` | `document/api/DocumentResource.java` |
| `fin.bpmn.SubmitService` | `document/service/DocumentSubmitService.java` |
| `fin.client.*` | `document/client/*` |
| `fin.kafka.DocumentProducer` | `document/messaging/DocumentProducer.java` |
| `org.KogitoEndpointFilter` | `shared/filter/KogitoEndpointFilter.java` |
| `fin.KogitoEndpointFilter` | `shared/filter/KogitoEndpointFilter.java` (merge) |
| `fin.S3Handler` | `shared/infrastructure/storage/S3Handler.java` |

---

## Implementation Strategy

### Phase 1: Shared Infrastructure (Day 1-2)
**Create:** `shared/` package

**Tasks:**
1. Create `shared/security/SecurityUtils.java`
2. Extract `getUserOrganization()` method
3. Create `shared/filter/KogitoEndpointFilter.java`
4. Move `S3Handler` to `shared/infrastructure/storage/`
5. Move validation utilities

**Files affected:** 4-5 files

---

### Phase 2: Organization Slice (Day 3-4)
**Create:** `organization/` slice

**Tasks:**
1. Create package structure
2. Move `Organization` entity to `organization/domain/`
3. Move `OrganizationRepository` to `organization/repository/`
4. Move `OrganizationResource` to `organization/api/`
5. Move DTOs to `organization/model/`
6. Move delegates to `organization/service/delegate/`
7. Update imports

**Files affected:** ~10 files

---

### Phase 3: Bommel Slice (Day 5-6)
**Create:** `bommel/` slice

**Tasks:**
1. Create package structure
2. Move `Bommel`, `TreeSearchBommel` to `bommel/domain/`
3. Move `BommelRepository` to `bommel/repository/`
4. Move `BommelResource` to `bommel/api/`
5. Move DTOs to `bommel/model/`
6. Extract service logic if needed
7. Update imports

**Files affected:** ~6 files

---

### Phase 4: Category Slice (Day 7)
**Create:** `category/` slice

**Tasks:**
1. Create package structure
2. Move `Category` to `category/domain/`
3. Move `CategoryRepository` to `category/repository/`
4. Move `CategoryResource` to `category/api/`
5. Move DTOs to `category/model/`
6. Update imports

**Files affected:** ~5 files

---

### Phase 5: Member Slice (Day 8)
**Create:** `member/` slice

**Tasks:**
1. Create package structure
2. Move `Member` to `member/domain/`
3. Move `MemberRepository` to `member/repository/`
4. Move `MemberResource` to `member/api/`
5. Move DTOs to `member/model/`
6. Update imports

**Files affected:** ~4 files

---

### Phase 6: Document Slice (Day 9-10)
**Create:** `document/` slice

**Tasks:**
1. Create package structure
2. Move document models to `document/domain/`
3. Move `DocumentResource` to `document/api/`
4. Move `SubmitService` to `document/service/`
5. Move clients to `document/client/`
6. Rename `fin.client.Bommel` → `BommelDto`
7. Move `DocumentProducer` to `document/messaging/`
8. Move DTOs to `document/model/`
9. Update imports

**Files affected:** ~12 files

---

### Phase 7: Transaction Slice (Day 11)
**Create:** `transaction/` slice

**Tasks:**
1. Create package structure
2. Move `TransactionRecord`, `TradeParty` to `transaction/domain/`
3. Move `TransactionRecordRepository` to `transaction/repository/`
4. Move `TransactionRecordResource` to `transaction/api/`
5. Move DTOs to `transaction/model/`
6. Update imports

**Files affected:** ~5 files

---

### Phase 8: Cleanup & Testing (Day 12-14)
**Tasks:**
1. Remove old `org/` and `fin/` packages
2. Verify all imports updated
3. Run full test suite
4. Fix any broken tests
5. Update documentation
6. Build and deploy

---

## Naming Conventions

### Package Names
- Slice names: lowercase, singular (e.g., `organization`, not `organizations`)
- Sub-packages: `api`, `domain`, `repository`, `service`, `model`, `client`

### Class Names
- Resources: `{Entity}Resource.java`
- Repositories: `{Entity}Repository.java`
- Services: `{Entity}Service.java`
- DTOs: `Create{Entity}Request`, `Update{Entity}Request`, `{Entity}Response`

### REST Paths
- Lowercase, plural: `/organizations`, `/bommels`, `/categories`

---

## Dependency Rules

### Allowed Dependencies
```
slice → shared ✅
slice → slice (minimal, through well-defined interfaces) ⚠️
```

### Prohibited Dependencies
```
shared → slice ❌
```

### Cross-Slice Communication
If slices need to communicate:
1. Through domain events (Kafka)
2. Through shared domain models
3. Via REST API (if truly independent services)

**Example:**
- `document/` needs organization info
- Solution: Query `organization/repository/` directly (acceptable for monolith)
- Or: Inject `OrganizationService` interface

---

## Import Examples

### Before
```java
// Confusing imports
import app.hopps.org.jpa.Organization;
import app.hopps.org.rest.OrganizationResource;
import app.hopps.fin.endpoint.DocumentResource;
import app.hopps.fin.jpa.entities.TransactionRecord;
```

### After
```java
// Clear slice-based imports
import app.hopps.organization.domain.Organization;
import app.hopps.organization.api.OrganizationResource;
import app.hopps.document.api.DocumentResource;
import app.hopps.transaction.domain.TransactionRecord;
import app.hopps.shared.security.SecurityUtils;
```

---

## Testing Strategy

### Slice-Level Tests
```java
@QuarkusTest
class OrganizationSliceTest {
    @Test
    void shouldCreateOrganization() {
        // Test complete vertical slice
    }
}
```

### Integration Tests
```java
@QuarkusTest
class OrganizationApiTest {
    @Test
    void shouldReturnOrganizationById() {
        // Test REST API
    }
}
```

---

## Success Metrics

✅ All 46 files migrated to vertical slices
✅ Zero duplicate code
✅ All tests passing
✅ Build successful
✅ Clear slice boundaries
✅ Documentation updated

---

## Rollback Plan

- Work in feature branch: `feat/vertical-slice-architecture`
- Keep `main` branch stable
- Incremental PRs per slice
- Easy to rollback if needed

---

**Ready to implement!**