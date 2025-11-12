# 11. Risks and Technical Debt

This chapter identifies technical risks, technical debt, and mitigation strategies for the Hopps platform.

---

## Current Technical Risks

### RISK-001: Circular Dependencies Between Slices

**Severity:** 🟡 Medium
**Probability:** Medium
**Status:** ⚠️ Present but managed

**Description:**
Some vertical slices have dependencies on each other:
- `organization/` → `member/`, `bommel/`
- `document/` → `transaction/`, `bommel/`

This can lead to:
- Tight coupling between slices
- Difficulty extracting slices into separate services
- Circular dependency issues during refactoring

**Current Mitigation:**
- Dependencies documented in architecture docs
- Strict dependency rules enforced in code reviews
- Interfaces used where possible to decouple
- Shared functionality moved to `shared/` package

**Future Mitigation:**
- Introduce domain events for cross-slice communication
- Use Kafka events instead of direct calls
- Consider aggregate boundaries from DDD

**Example:**
```java
// Current: Direct dependency
@Inject
BommelRepository bommelRepository;

// Better: Event-driven
documentProducer.publish(new DocumentAnalyzed(documentId, organizationId));
```

---

### RISK-002: BPMN Process Complexity

**Severity:** 🟡 Medium
**Probability:** High
**Status:** ⚠️ Increasing

**Description:**
As more workflows added (org creation, document submission, member invitation), BPMN processes become complex:
- Difficult to debug failed processes
- Process state stored in database (can't easily replay)
- Error handling across multiple steps
- Process versioning and migration

**Impact:**
- Increased development time for workflows
- Difficult to troubleshoot production issues
- Process state cleanup required

**Mitigation:**
- Keep processes simple (< 10 steps)
- Comprehensive logging in delegates
- Kogito management endpoints for monitoring
- Process instance cleanup jobs
- Document BPMN diagrams in architecture docs

**Monitoring:**
```java
// Add logging to all delegates
LOG.infof("Executing delegate: %s for process instance: %s",
    this.getClass().getSimpleName(),
    workItem.getProcessInstanceId()
);
```

---

### RISK-003: Single Database Bottleneck

**Severity:** 🟡 Medium
**Probability:** Medium (future)
**Status:** ⚠️ Acceptable for now

**Description:**
All services share single PostgreSQL database:
- Becomes bottleneck at scale
- Schema migrations affect all services
- Difficult to scale individual services
- Violates microservices principle (shared database)

**Current State:**
- Single PostgreSQL instance (RDS)
- Read replicas for read-heavy queries
- Connection pool per service (max 16)

**Future Impact:**
- Performance degradation at >1000 organizations
- Schema lock contention during migrations
- Cascading failures if database unavailable

**Mitigation Strategy:**
1. **Short Term (< 6 months):**
   - Optimize queries (explain analyze)
   - Add database indexes
   - Enable read replicas
   - Cache frequently accessed data

2. **Medium Term (6-12 months):**
   - Implement CQRS (Command Query Responsibility Segregation)
   - Separate read and write databases
   - Event sourcing for audit trail

3. **Long Term (> 12 months):**
   - Migrate to database per service
   - Use Saga pattern for distributed transactions
   - Kafka for cross-service data synchronization

---

### RISK-004: AI Service Dependency

**Severity:** 🟡 Medium
**Probability:** Medium
**Status:** ⚠️ Mitigated

**Description:**
Document processing depends on external AI services:
- `app.hopps.az-document-ai` for document analysis
- `app.hopps.fin-narrator` for semantic tagging
- `app.hopps.zugferd` for invoice parsing

Risks:
- Service unavailability blocks document processing
- No fallback if AI service down
- Network latency affects user experience

**Mitigation:**
- Graceful degradation (manual entry if AI fails)
- Async processing (doesn't block upload)
- Retry logic with exponential backoff
- Circuit breaker pattern
- Health checks for dependent services

**Implementation:**
```java
@Inject
@RestClient
DocumentAnalyzeClient aiClient;

public DocumentData processDocument(String s3Key) {
    try {
        return aiClient.analyze(s3Key);
    } catch (WebApplicationException e) {
        LOG.warn("AI service unavailable, using manual entry", e);
        return DocumentData.empty();  // Graceful degradation
    }
}
```

---

### RISK-005: Keycloak Single Point of Failure

**Severity:** 🔴 High
**Probability:** Low
**Status:** ⚠️ Partially mitigated

**Description:**
All authentication goes through Keycloak:
- If Keycloak down, users cannot log in
- No new API requests possible (JWT validation fails eventually)
- Single point of failure for entire platform

**Impact:**
- Complete service outage
- All users locked out
- Critical business impact

**Current Mitigation:**
- Keycloak deployed with HA (2 replicas)
- Keycloak uses separate PostgreSQL database
- Health checks and auto-restart
- JWT tokens cached (valid until expiry, typically 15 minutes)

**Future Mitigation:**
- Multi-region Keycloak deployment
- Database replication across regions
- Disaster recovery procedure documented
- Regular Keycloak backups (realm export)

**RTO/RPO:**
- **RTO (Recovery Time Objective):** 15 minutes
- **RPO (Recovery Point Objective):** 5 minutes

---

### RISK-006: Insufficient Test Coverage

**Severity:** 🟡 Medium
**Probability:** High
**Status:** ⚠️ Improving

**Description:**
Current test coverage ~65%, below target of 80%:
- Some code paths not tested
- Difficult to refactor confidently
- Bugs may slip to production
- Technical debt accumulates

**Impact:**
- Slower development velocity
- Fear of refactoring
- Production bugs
- Customer dissatisfaction

**Mitigation:**
1. **Unit Tests:**
   - Add tests for all new code
   - Require tests for bug fixes
   - JaCoCo enforces minimum coverage

2. **Integration Tests:**
   - Quarkus Test for API endpoints
   - Test all happy paths
   - Test error conditions

3. **Contract Tests:**
   - Pact for frontend-backend contracts
   - Verify API compatibility

4. **E2E Tests:**
   - Playwright for critical user flows
   - Run before production deployment

**Action Plan:**
- Sprint goal: Increase coverage by 5% per sprint
- Target: 80% coverage by Q2 2025
- CI blocks PRs with <70% coverage (new code)

---

### RISK-007: Kafka Operational Complexity

**Severity:** 🟡 Medium
**Probability:** Medium
**Status:** ⚠️ Acceptable risk

**Description:**
Kafka adds operational complexity:
- Requires Zookeeper (or KRaft mode)
- Topic and partition management
- Consumer group management
- Message ordering guarantees
- Monitoring and alerting

**Impact:**
- Increased infrastructure costs
- Need Kafka expertise
- Complex debugging of event flows
- Potential message loss if misconfigured

**Mitigation:**
- Use managed Kafka (AWS MSK, Confluent Cloud)
- Comprehensive Kafka monitoring (Prometheus + Grafana)
- Document topic conventions and schemas
- Test consumer failures and reprocessing
- Dead letter queues for failed messages

**When to Remove:**
- If event volume is low (< 1000 events/day)
- If only used for notifications (use simple queue instead)
- If operational burden too high

---

### RISK-008: S3 Data Loss or Unavailability

**Severity:** 🟡 Medium
**Probability:** Very Low
**Status:** ✅ Mitigated by AWS

**Description:**
Documents stored in S3 could be:
- Accidentally deleted
- Lost due to AWS outage (99.99% availability = 52 minutes downtime/year)
- Corrupted

**Impact:**
- Permanent data loss
- Compliance violations
- Customer trust damage

**Mitigation:**
- **S3 Versioning:** Enabled on all buckets (recover deleted files)
- **S3 Replication:** Cross-region replication for disaster recovery
- **Lifecycle Policies:** Transition to Glacier for long-term archival
- **Object Lock:** Prevent deletion for compliance (10-year retention)
- **Backup:** Periodic backup to separate storage

**S3 Configuration:**
```yaml
Versioning: Enabled
Replication:
  DestinationBucket: hopps-documents-backup-eu-west-1
  Status: Enabled
LifecycleConfiguration:
  - Id: ArchiveAfter90Days
    Status: Enabled
    Transitions:
      - Days: 90
        StorageClass: STANDARD_IA
      - Days: 365
        StorageClass: GLACIER
```

---

### RISK-009: Insufficient Monitoring and Alerting

**Severity:** 🟡 Medium
**Probability:** Medium
**Status:** 🟡 Partially implemented

**Description:**
Current monitoring may not detect all issues:
- Only infrastructure metrics (CPU, memory)
- No business metrics (orgs created, docs uploaded)
- No alerting for critical errors
- No on-call rotation

**Impact:**
- Issues discovered by users instead of ops
- Slow incident response
- Poor customer experience
- SLA violations

**Mitigation:**
1. **Infrastructure Monitoring:**
   - ✅ Prometheus metrics
   - ✅ Grafana dashboards
   - 🟡 Alertmanager rules (partial)

2. **Application Monitoring:**
   - 🟡 Custom business metrics (partial)
   - 🔲 APM (Application Performance Monitoring)
   - 🔲 Distributed tracing (Jaeger)

3. **Alerting:**
   - 🟡 Slack notifications (basic)
   - 🔲 PagerDuty integration
   - 🔲 On-call rotation
   - 🔲 Runbooks for common issues

**Action Plan:**
- Define SLOs (Service Level Objectives)
- Create Grafana dashboards for business metrics
- Set up alerting rules in Alertmanager
- Document incident response procedures

---

### RISK-010: Security Vulnerabilities in Dependencies

**Severity:** 🔴 High
**Probability:** Medium
**Status:** 🟡 Monitored

**Description:**
Third-party dependencies may have security vulnerabilities:
- Quarkus, PostgreSQL driver, Keycloak client
- Frontend libraries (React, etc.)
- Transitive dependencies

**Impact:**
- Data breach
- System compromise
- Compliance violations
- Reputation damage

**Mitigation:**
- **Dependabot:** Automated dependency updates (GitHub)
- **Snyk:** Vulnerability scanning in CI/CD
- **OWASP Dependency Check:** Maven plugin
- **Regular Updates:** Monthly dependency review
- **Security Advisories:** Subscribe to security mailing lists

**Process:**
1. Dependabot creates PR for vulnerable dependency
2. CI runs tests
3. Security team reviews advisory
4. Deploy fix within 48 hours (critical), 1 week (high)

---

## Technical Debt Inventory

### DEBT-001: Old org/fin Module Separation (Resolved)

**Status:** ✅ Resolved (2025-11-12)
**Resolution:** Migrated to Vertical Slice Architecture

**Original Issue:**
Backend organized into `org` (organization) and `fin` (financial) modules with:
- Unclear boundaries
- Duplicate code (KogitoEndpointFilter, S3Handler, getUserOrganization)
- Inconsistent naming (rest/ vs endpoint/, jpa/ vs jpa/entities/)

**Resolution:**
- Reorganized into 6 vertical slices + shared infrastructure
- Eliminated all duplicate code
- Consistent package structure

**Benefit:**
- Improved maintainability
- Faster development
- Easier onboarding

---

### DEBT-002: Missing Integration Tests

**Status:** ⚠️ Active
**Priority:** High
**Effort:** 4-6 weeks

**Description:**
Some slices lack comprehensive integration tests:
- `bommel/` - Tree operations not fully tested
- `document/` - AI integration mocked, not tested end-to-end
- `transaction/` - Few tests

**Impact:**
- Bugs may reach production
- Fear of refactoring
- Slower development

**Action Plan:**
1. Add integration tests for all REST endpoints
2. Test error conditions (validation, auth)
3. Test multi-tenancy (cross-org access)
4. Target: 80% coverage

**Timeline:** Q1 2025

---

### DEBT-003: Hardcoded Configuration

**Status:** ⚠️ Active
**Priority:** Medium
**Effort:** 1-2 weeks

**Description:**
Some configuration still hardcoded or in application.yaml:
- S3 bucket names
- Kafka topic names
- Service URLs

**Impact:**
- Difficult to change environments
- Configuration drift
- Not 12-factor compliant

**Action Plan:**
1. Move all config to environment variables
2. Use Kubernetes ConfigMaps
3. Document all configuration options
4. Validate config on startup

**Example:**
```yaml
# Before (hardcoded)
s3:
  bucket: hopps-documents-prod

# After (externalized)
s3:
  bucket: ${S3_BUCKET:hopps-documents-dev}
```

---

### DEBT-004: Incomplete API Documentation

**Status:** ⚠️ Active
**Priority:** Medium
**Effort:** 1 week

**Description:**
OpenAPI documentation incomplete:
- Missing request/response examples
- No error response documentation
- Authentication not documented

**Impact:**
- Frontend developers guess API behavior
- Contract tests difficult to write
- Poor developer experience

**Action Plan:**
1. Add `@APIResponse` annotations
2. Provide request/response examples
3. Document authentication flow
4. Generate client library from OpenAPI

---

### DEBT-005: No API Versioning

**Status:** ⚠️ Active
**Priority:** Low (no breaking changes yet)
**Effort:** 2-3 weeks

**Description:**
API not versioned, future breaking changes will be difficult.

**Impact:**
- Breaking changes affect all clients
- No gradual migration path
- Client compatibility issues

**Action Plan:**
1. Introduce API versioning (URL path: `/api/v1/`)
2. Document versioning policy
3. Support multiple versions during migration
4. Deprecation warnings

**Timeline:** When breaking change needed

---

### DEBT-006: Single Organization per User Limitation

**Status:** ⚠️ Active
**Priority:** Low (not requested yet)
**Effort:** 2-3 weeks

**Description:**
Current implementation assumes user belongs to single organization:
```java
if (orgs.size() > 1) {
    throw new IllegalStateException("Multiple organizations not implemented");
}
```

**Impact:**
- Users cannot belong to multiple organizations
- Blocks use cases (consultant across multiple clients)

**Action Plan:**
1. Add organization selector to UI
2. Include organization ID in all API requests
3. Update SecurityUtils to support multiple orgs
4. Test data isolation thoroughly

**Timeline:** When requested by users

---

## Risk Mitigation Priorities

### Immediate (Next Sprint)
1. ✅ Complete arc42 documentation
2. ⚠️ Increase test coverage to 70%
3. ⚠️ Set up basic alerting (Slack)

### Short Term (1-3 months)
1. ⚠️ Add integration tests for all slices
2. ⚠️ Externalize all configuration
3. ⚠️ Complete OpenAPI documentation
4. ⚠️ Implement distributed tracing

### Medium Term (3-6 months)
1. 🔲 Security audit (third-party)
2. 🔲 Load testing and performance tuning
3. 🔲 Disaster recovery drill
4. 🔲 API versioning strategy

### Long Term (6-12 months)
1. 🔲 Database per service migration
2. 🔲 Multi-region deployment
3. 🔲 Advanced monitoring (APM, tracing)
4. 🔲 Chaos engineering

---

## Risk Review Process

**Frequency:** Quarterly

**Process:**
1. Review all risks (probability, impact)
2. Update mitigation progress
3. Add new risks
4. Retire resolved risks
5. Reprioritize action items

**Next Review:** 2025-02-12

---

## Conclusion

The Hopps platform has acceptable technical risk level for current scale:
- **Critical Risks:** 1 (Keycloak SPOF - mitigated with HA)
- **High Risks:** 1 (dependency vulnerabilities - monitored)
- **Medium Risks:** 7 (managed with mitigation plans)
- **Low Risks:** 0

Technical debt is being actively managed with clear action plans and timelines.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Active
**Next Review:** 2025-02-12
