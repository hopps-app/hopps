# Multi-Organization Test Fix Guide

## Summary

After implementing multi-organization support, **57 tests are failing** because entities now require an `organization` foreign key. All failures follow the same pattern and can be fixed using the approach below.

## Test Results
- **Total Tests**: 191
- **Passing**: 134 (70%)
- **Failing**: 57 (30%)
  - Errors: 52
  - Failures: 5

## Root Cause

Tests are failing for two main reasons:

1. **Entities created without organization**: Tests create entities (Document, Member, Bommel, WorkflowInstance, Tag, TransactionRecord) without setting the required `organization` field, causing database constraint violations.

2. **OrganizationContext unavailable**: Resource tests fail with `ArcUndeclaredThrowableException` because `OrganizationContext` cannot resolve the current organization (no routing context in tests).

## Fix Pattern

### Step 1: Extend BaseOrganizationTest

All test classes that create entities should extend `BaseOrganizationTest`:

```java
import app.hopps.shared.BaseOrganizationTest;

@QuarkusTest
class MyTest extends BaseOrganizationTest {
    // test methods
}
```

### Step 2: Get Test Organization in Each Test

At the start of each test method that creates entities, call:

```java
@TestTransaction
@Test
void shouldDoSomething() {
    Organization org = getOrCreateTestOrganization();

    // Continue with test...
}
```

### Step 3: Set Organization on All Entities

Before persisting any entity, set its organization:

```java
// Example: Creating a Document
Document doc = new Document();
doc.setName("Test Document");
doc.setOrganization(org);  // ← Required!
documentRepository.persist(doc);

// Example: Creating a Member
Member member = new Member();
member.setFirstName("Test");
member.setLastName("User");
member.setOrganization(org);  // ← Required!
memberRepository.persist(member);

// Example: Creating a Tag
Tag tag = new Tag("test-tag");
tag.setOrganization(org);  // ← Required!
tagRepository.persist(tag);
```

### Step 4: Set Organization on Related Entities

When creating related entities (like TradeParty in a Document), set their organization too:

```java
Document doc = new Document();
doc.setOrganization(org);

TradeParty sender = new TradeParty();
sender.setName("Test Sender");
sender.setOrganization(org);  // ← Required!
doc.setSender(sender);
```

## Failing Tests by Category

### 1. Tag-Related Tests (✅ FIXED)
- `TagRepositoryTest` - All tests fixed

### 2. Transaction-Related Tests (3 failures + 1 error)
**Files**: `TransactionRecordRepositoryTest.java`, `TransactionRecordTest.java`, `TransactionResourceTest.java`

**Pattern**:
```java
@QuarkusTest
class TransactionRecordRepositoryTest extends BaseOrganizationTest {

    @TestTransaction
    @Test
    void shouldFindAllOrderedByDate() {
        Organization org = getOrCreateTestOrganization();

        TransactionRecord tx1 = new TransactionRecord(BigDecimal.valueOf(100), "user");
        tx1.setOrganization(org);
        tx1.setTransactionTime(Instant.parse("2024-01-01T00:00:00Z"));
        repository.persist(tx1);

        // ... continue test
    }
}
```

### 3. Document-Related Tests (8 errors)
**Files**: `DocumentResourceTest.java`, `DocumentTagTest.java`, `DocumentProcessingWorkflowTest.java`

**Pattern**:
```java
@QuarkusTest
class DocumentResourceTest extends BaseOrganizationTest {

    @TestTransaction
    @Test
    void shouldShowDocumentDetailPage() {
        Organization org = getOrCreateTestOrganization();

        Document doc = createDocument("Test Doc");
        doc.setOrganization(org);
        documentRepository.persist(doc);

        // ... continue test
    }
}
```

### 4. Member/Bommel Resource Tests (13 errors)
**Files**: `MemberResourceTest.java`, `BommelResourceTest.java`

**Issue**: These tests fail with `ArcUndeclaredThrowableException` because `RoutingContext` is not available in tests.

**Solution**: The `OrganizationContext` has been updated to handle missing RoutingContext. Tests still need to create a test organization:

```java
@QuarkusTest
class MemberResourceTest extends BaseOrganizationTest {

    @TestTransaction
    @Test
    void shouldShowMembersInTable() {
        Organization org = getOrCreateTestOrganization();

        Member member = createMember("John", "Doe");
        member.setOrganization(org);
        memberRepository.persist(member);

        // ... continue test
    }
}
```

### 5. Workflow/ProcessEngine Tests (11 errors)
**Files**: `ProcessEngineTest.java`

**Pattern**:
```java
@QuarkusTest
class ProcessEngineTest extends BaseOrganizationTest {

    @TestTransaction
    @Test
    void givenSystemTasksOnly_whenStartProcess_thenCompletesImmediately() {
        Organization org = getOrCreateTestOrganization();

        WorkflowInstance instance = new WorkflowInstance();
        instance.setProcessName("TestProcess");
        instance.setOrganization(org);
        instanceRepository.persist(instance);

        // ... continue test
    }
}
```

## Complete Example: Before & After

### Before (Failing)
```java
@QuarkusTest
class DocumentTagTest {
    @Inject
    DocumentRepository documentRepository;

    @TestTransaction
    @Test
    void shouldPersistDocumentWithTags() {
        Document doc = new Document();
        doc.setName("Invoice");
        documentRepository.persist(doc);  // ❌ FAILS: null organization_id

        Tag tag = new Tag("urgent");
        tagRepository.persist(tag);  // ❌ FAILS: null organization_id
    }
}
```

### After (Fixed)
```java
@QuarkusTest
class DocumentTagTest extends BaseOrganizationTest {  // ← Extend base class
    @Inject
    DocumentRepository documentRepository;

    @TestTransaction
    @Test
    void shouldPersistDocumentWithTags() {
        Organization org = getOrCreateTestOrganization();  // ← Get org

        Document doc = new Document();
        doc.setName("Invoice");
        doc.setOrganization(org);  // ← Set org
        documentRepository.persist(doc);  // ✅ Works

        Tag tag = new Tag("urgent");
        tag.setOrganization(org);  // ← Set org
        tagRepository.persist(tag);  // ✅ Works
    }
}
```

## Automated Fix Script (Optional)

For bulk fixing, you could use this pattern:

1. Add `extends BaseOrganizationTest` to test class
2. Add `Organization org = getOrCreateTestOrganization();` at the start of each test method
3. Add `.setOrganization(org)` before each `persist()` call

## Testing the Fixes

After fixing a test file:

```bash
# Test a specific class
./mvnw test -Dtest=ClassName

# Run all tests
./mvnw test
```

## Progress Tracking

- [x] TagRepositoryTest (6/6 tests) ✅
- [ ] TransactionRecordRepositoryTest (0/3 tests)
- [ ] TransactionRecordTest (0/2 tests)
- [ ] TransactionResourceTest (0/4 tests)
- [ ] DocumentResourceTest (0/8 tests)
- [ ] DocumentTagTest (0/5 tests)
- [ ] DocumentProcessingWorkflowTest (0/3 tests)
- [ ] MemberResourceTest (0/7 tests)
- [ ] BommelResourceTest (0/7 tests)
- [ ] ProcessEngineTest (0/11 tests)

## Estimated Effort

- **Per test file**: 5-15 minutes (depending on complexity)
- **Total remaining**: ~2-3 hours for all 57 tests

## Next Steps

1. Apply the fix pattern to remaining test files
2. Run tests after each file to verify
3. Commit working tests incrementally

Once all tests pass, the multi-organization implementation will be complete!
