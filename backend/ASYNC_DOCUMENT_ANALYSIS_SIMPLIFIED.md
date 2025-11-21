# Asynchronous Document Analysis - Simplified Implementation

## Overview

This implementation provides asynchronous document processing with Server-Sent Events (SSE) for real-time updates. **The backend does NOT track which fields users edit** - it's the frontend's responsibility to decide which values to save.

## Key Principle

**Backend Rule:** Never overwrite existing values in TransactionRecord.
**Frontend Rule:** Decide which extracted values to save based on user interaction.

## Architecture Flow

```
1. User uploads document
   ↓
2. DocumentResource creates empty TransactionRecord (status: PENDING)
   ↓
3. Returns 202 Accepted immediately with transaction ID
   ↓
4. Document queued to Kafka (document-analysis topic)
   ↓
5. DocumentAnalysisConsumer processes asynchronously
   ├─ Updates status to ANALYZING
   ├─ Broadcasts SSE: analysis.started
   ├─ Calls SubmitService.analyzeDocumentAsync()
   │  ├─ Try ZugFerd extraction
   │  ├─ Fallback to Azure Document Intelligence
   │  └─ Generate AI tags
   ├─ Stores extracted data in TransactionRecordAnalysisResult
   ├─ Does NOT update TransactionRecord fields
   ├─ Updates status to ANALYZED
   └─ Broadcasts SSE: analysis.completed with extracted data
   ↓
6. Frontend receives SSE with extracted data
   ↓
7. Frontend decides which fields to fill based on user interaction
   ↓
8. Frontend PATCHes only the fields it wants to save
   ↓
9. Backend saves whatever frontend sends (no special logic)
```

## Backend Behavior

### During Analysis
- Extract data from document
- Store in `TransactionRecordAnalysisResult.extractedData` (JSON)
- Send via SSE to frontend
- **Do NOT update TransactionRecord fields**

### When Frontend PATCHes
- Accept whatever values frontend sends
- **No tracking** of which fields were edited
- **No validation** against analysis results
- Simple rule: Set the value

### Protecting Against Overwrites
- InvoiceData/ReceiptData check `if (field == null)` before setting
- Only fills empty fields during synchronous flow (old behavior)
- Async flow doesn't call `updateTransactionRecord()` at all

## Entity Changes

### TransactionRecord
**Added:**
- `status: TransactionStatus` (PENDING, ANALYZING, ANALYZED, FAILED)
- `createdAt: Instant`
- `updatedAt: Instant`
- `total` - Made nullable

**Removed:**
- ❌ No `userEditedFields` set
- ❌ No `*EditedByUser` boolean flags

### TransactionRecordAnalysisResult
**Stores:**
- `extractedData: Map<String, Object>` - All AI-extracted data as JSON
- `status: AnalysisStatus`
- `extractionMethod: String` (ZUGFERD, AZURE)
- `confidenceScores: Map<String, Double>`
- `stepProgress: Map<AnalysisStep, StepStatus>`
- Error handling fields
- Timestamps

## REST API

### 1. POST /document → 202 Accepted
```json
{
  "transactionRecordId": 42,
  "documentKey": "a1b2c3d4-...",
  "status": "PENDING",
  "analysisStatus": "QUEUED",
  "_links": {
    "self": "/transaction-records/42",
    "analysis": "/transaction-records/42/analysis",
    "events": "/transaction-records/42/events"
  }
}
```

### 2. GET /transaction-records/{id}
```json
{
  "id": 42,
  "documentKey": "a1b2c3d4-...",
  "status": "ANALYZED",
  "total": null,              // Empty until frontend saves
  "name": null,
  "invoiceId": null,
  "createdAt": "2024-11-12T14:30:00Z",
  "updatedAt": "2024-11-12T14:30:00Z"
}
```

### 3. GET /transaction-records/{id}/analysis
```json
{
  "id": 1,
  "status": "COMPLETED",
  "extractedData": {
    "total": "1500.00",
    "invoiceDate": "2024-11-12",
    "invoiceId": "INV-2024-001",
    "customerName": "Acme Corp",
    "currencyCode": "EUR",
    "tags": ["consulting", "software"],
    "sender": { "name": "Acme Corp", "country": "DE" }
  },
  "extractionMethod": "ZUGFERD",
  "completedAt": "2024-11-12T14:30:15Z"
}
```

### 4. GET /transaction-records/{id}/events (SSE)
```
event: analysis.started
data: {"transactionRecordId":42,"status":"IN_PROGRESS"}

event: analysis.completed
data: {
  "transactionRecordId":42,
  "extractedData":{
    "total":"1500.00",
    "invoiceId":"INV-2024-001",
    "customerName":"Acme Corp",
    "tags":["consulting","software"]
  },
  "extractionMethod":"ZUGFERD"
}
```

### 5. PATCH /transaction-records/{id}
Frontend sends only fields it wants to save:

**Request:**
```json
{
  "total": "1500.00",
  "invoiceId": "INV-2024-001",
  "name": "Acme Corp"
}
```

**Response:**
```json
{
  "id": 42,
  "total": 1500.00,
  "invoiceId": "INV-2024-001",
  "name": "Acme Corp",
  "updatedAt": "2024-11-12T14:32:00Z"
}
```

Backend just sets the values, no questions asked.

## Frontend Implementation Pattern

```typescript
// 1. Upload document
const { transactionRecordId } = await uploadDocument(file);

// 2. Track which fields user has edited in UI state
const userEditedFields = new Set<string>();

function handleFieldEdit(field: string, value: any) {
  userEditedFields.add(field);
  record[field] = value;
}

// 3. Subscribe to SSE
const eventSource = new EventSource(`/transaction-records/${transactionRecordId}/events`);

eventSource.addEventListener('analysis.completed', (e) => {
  const { extractedData } = JSON.parse(e.data);

  // Only fill fields user hasn't touched in the current session
  Object.entries(extractedData).forEach(([field, value]) => {
    if (!userEditedFields.has(field) && !record[field]) {
      record[field] = value;
    }
  });

  // Now save the merged data to backend
  saveTransaction(record);

  eventSource.close();
});

// 4. Save transaction (frontend decides what to send)
async function saveTransaction(record: TransactionRecord) {
  const fieldsToSave = {};

  // Only send fields that have values
  if (record.total) fieldsToSave.total = record.total;
  if (record.name) fieldsToSave.name = record.name;
  if (record.invoiceId) fieldsToSave.invoiceId = record.invoiceId;
  // ... etc

  await fetch(`/transaction-records/${record.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fieldsToSave)
  });
}

// 5. Load existing transaction (when returning to page)
async function loadTransaction(id: number) {
  const record = await fetch(`/transaction-records/${id}`).then(r => r.json());

  if (record.status === 'ANALYZED' && !record.total) {
    // No data saved yet, load analysis suggestions
    const analysis = await fetch(`/transaction-records/${id}/analysis`)
      .then(r => r.json());

    // Pre-fill empty fields with suggestions
    Object.entries(analysis.extractedData).forEach(([field, value]) => {
      if (!record[field]) {
        record[field] = value;
      }
    });
  } else if (record.status === 'ANALYZING') {
    // Still processing, subscribe to SSE
    subscribeToSSE(id);
  }

  return record;
}
```

## Key Differences from Previous Implementation

| Aspect | Old (Tracking) | New (Simplified) |
|--------|---------------|------------------|
| **Edit Tracking** | Backend tracks `userEditedFields` set or boolean flags | Frontend tracks in UI state only |
| **Analysis Storage** | Directly updates TransactionRecord | Stores in AnalysisResult, sends to frontend |
| **Overwrite Protection** | Backend checks flags before updating | Backend never auto-updates, frontend decides |
| **PATCH Logic** | Sets value + tracking flag | Just sets value |
| **Database Columns** | Extra columns for tracking | No extra columns needed |
| **Responsibility** | Backend decides what to overwrite | Frontend decides what to save |

## Database Migration

```sql
-- Only need basic fields, no tracking columns
ALTER TABLE transaction_record
ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN total DROP NOT NULL; -- Make nullable

-- Analysis result table
CREATE TABLE transaction_record_analysis_result (
  id BIGSERIAL PRIMARY KEY,
  transaction_record_id BIGINT NOT NULL UNIQUE REFERENCES transaction_record(id),
  status VARCHAR(20) NOT NULL,
  extracted_data JSONB,
  extraction_method VARCHAR(50),
  confidence_scores JSONB,
  error_code VARCHAR(100),
  error_message VARCHAR(1000),
  failed_step VARCHAR(50),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Step progress table
CREATE TABLE analysis_step_progress (
  analysis_result_id BIGINT NOT NULL REFERENCES transaction_record_analysis_result(id),
  step VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  PRIMARY KEY (analysis_result_id, step)
);
```

## Benefits

✅ **Simpler Backend** - No tracking logic, just store what frontend sends
✅ **Flexible Frontend** - Complete control over UI/UX decisions
✅ **Fewer Database Columns** - No tracking flags needed
✅ **Clear Separation** - Backend extracts, frontend decides
✅ **Easier Testing** - Less conditional logic to test
✅ **Better Performance** - No need to check multiple boolean flags

## Files Changed

### Created:
- `TransactionStatus.java`
- `AnalysisStatus.java`, `AnalysisStep.java`, `StepStatus.java`
- `TransactionRecordAnalysisResult.java`
- `AnalysisResultRepository.java`
- `DocumentUploadResponse.java`
- `DocumentAnalysisMessage.java`
- `AnalysisEventBroadcaster.java`
- `DocumentAnalysisConsumer.java`

### Modified:
- `TransactionRecord.java` - Added status, timestamps (no tracking fields)
- `DocumentResource.java` - Returns 202, queues to Kafka
- `SubmitService.java` - Stores in AnalysisResult, doesn't update TransactionRecord
- `InvoiceData.java` - Only updates if field is null
- `ReceiptData.java` - Only updates if field is null
- `DocumentProducer.java` - Added queueForAnalysis()
- `DocumentAnalysisConsumer.java` - Broadcasts extractedData from AnalysisResult
- `TransactionRecordResource.java` - Simple PATCH (no tracking logic)
- `application.properties` - Added Kafka channel

## Testing Scenarios

1. ✅ Upload → 202 response immediately
2. ✅ SSE receives analysis.completed with extractedData
3. ✅ Frontend PATCHes selected fields → backend saves them
4. ✅ User leaves during analysis → can load analysis results later
5. ✅ User edits field → tracked in frontend, not sent in PATCH
6. ✅ Analysis fails → status=FAILED, error in AnalysisResult
7. ✅ Concurrent uploads → each gets separate analysis and SSE

## Summary

**The backend's job:** Extract data and suggest values.
**The frontend's job:** Decide what to save based on user interaction.
**No tracking needed:** Frontend maintains UI state, backend just stores final values.

This is simpler, cleaner, and gives the frontend complete control!
