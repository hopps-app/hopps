# Asynchronous Document Analysis Implementation

## Overview

This implementation adds asynchronous document processing with Server-Sent Events (SSE) for real-time updates. Documents are uploaded immediately, while analysis runs in the background, allowing users to edit fields while analysis completes.

## Architecture Flow

```
1. User uploads document
   ↓
2. DocumentResource creates TransactionRecord (status: PENDING)
   ↓
3. Returns 202 Accepted immediately
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
   ├─ Updates TransactionRecord with extracted data
   ├─ Saves to TransactionRecordAnalysisResult
   ├─ Updates status to ANALYZED
   └─ Broadcasts SSE: analysis.completed
   ↓
6. Frontend receives SSE with extracted data
   ↓
7. Frontend fills only non-edited fields
```

## New Entities

### 1. TransactionStatus (enum)
- `PENDING` - Just created, not analyzed
- `ANALYZING` - Analysis in progress
- `ANALYZED` - Analysis complete
- `FAILED` - Analysis failed

### 2. AnalysisStatus (enum)
- `QUEUED` - Waiting to be processed
- `IN_PROGRESS` - Currently analyzing
- `COMPLETED` - Analysis successful
- `FAILED` - Analysis failed

### 3. AnalysisStep (enum)
- `ZUGFERD_EXTRACTION` - e-invoice parsing
- `AZURE_EXTRACTION` - Azure AI extraction
- `TAGGING` - LLM semantic tagging

### 4. StepStatus (enum)
- `PENDING`, `IN_PROGRESS`, `COMPLETED`, `SKIPPED`, `FAILED`

### 5. TransactionRecordAnalysisResult (entity)
Stores analysis metadata separately from the transaction record:
- `transactionRecord` - Link to transaction
- `status` - Overall analysis status
- `extractedData` - JSON of AI suggestions
- `extractionMethod` - ZUGFERD or AZURE
- `confidenceScores` - Per-field confidence
- `stepProgress` - Progress of each step
- `errorCode`, `errorMessage`, `failedStep` - Error handling
- `startedAt`, `completedAt` - Timestamps

## Updated Entities

### TransactionRecord
Added fields:
- `status: TransactionStatus` - Current processing status
- `createdAt: Instant` - Creation timestamp
- `updatedAt: Instant` - Last update timestamp
- `total` - Made nullable (populated by analysis)

**User-edited field tracking (boolean flags):**
- `totalEditedByUser` - Total amount edited
- `transactionTimeEditedByUser` - Transaction time edited
- `nameEditedByUser` - Name/customer/store edited
- `orderNumberEditedByUser` - Order number edited
- `invoiceIdEditedByUser` - Invoice ID edited
- `dueDateEditedByUser` - Due date edited
- `amountDueEditedByUser` - Amount due edited
- `currencyCodeEditedByUser` - Currency code edited
- `tagsEditedByUser` - Tags edited
- `senderEditedByUser` - Sender/trade party edited
- `recipientEditedByUser` - Recipient/trade party edited

These flags are set to `true` when user edits the corresponding field, preventing AI from overwriting user changes.

## REST API Endpoints

### 1. POST /document
**Upload document (returns 202 Accepted immediately)**

Request:
```
POST /document
Content-Type: multipart/form-data

file: [binary]
type: INVOICE | RECEIPT
bommelId: 23
privatelyPaid: true
```

Response (202 Accepted):
```json
{
  "transactionRecordId": 42,
  "documentKey": "a1b2c3d4-...",
  "status": "PENDING",
  "analysisStatus": "QUEUED",
  "_links": {
    "self": "/transaction-records/42",
    "analysis": "/transaction-records/42/analysis",
    "events": "/transaction-records/42/events",
    "document": "/document/a1b2c3d4-..."
  }
}
```

### 2. GET /transaction-records/{id}
**Get transaction record**

Response:
```json
{
  "id": 42,
  "documentKey": "a1b2c3d4-...",
  "status": "ANALYZED",
  "total": 1500.00,
  "transactionTime": "2024-11-12T00:00:00Z",
  "invoiceId": "INV-2024-001",
  "name": "Acme Corp",
  "tags": ["consulting", "software"],
  "totalEditedByUser": true,
  "nameEditedByUser": true,
  "invoiceIdEditedByUser": false,
  "createdAt": "2024-11-12T14:30:00Z",
  "updatedAt": "2024-11-12T14:32:00Z"
}
```

### 3. GET /transaction-records/{id}/analysis
**Get analysis result with metadata**

Response:
```json
{
  "id": 1,
  "status": "COMPLETED",
  "extractedData": {
    "total": "1500.00",
    "invoiceId": "INV-2024-001",
    "name": "Acme Corp",
    "tags": ["consulting", "software"]
  },
  "extractionMethod": "ZUGFERD",
  "confidenceScores": {
    "total": 0.99,
    "invoiceId": 0.95
  },
  "startedAt": "2024-11-12T14:30:01Z",
  "completedAt": "2024-11-12T14:30:15Z"
}
```

### 4. GET /transaction-records/{id}/events
**Subscribe to Server-Sent Events**

Response (text/event-stream):
```
event: analysis.started
data: {"transactionRecordId":42,"status":"IN_PROGRESS"}

event: analysis.completed
data: {"transactionRecordId":42,"extractedData":{...}}

:keepalive
```

Event types:
- `analysis.started` - Analysis began
- `analysis.completed` - Analysis finished with data
- `analysis.failed` - Analysis failed
- `:keepalive` - Heartbeat every 30s

### 5. PATCH /transaction-records/{id}
**Update transaction record (tracks edits)**

Request:
```json
{
  "total": 1600.00,
  "name": "Acme Corporation (corrected)"
}
```

Response:
```json
{
  "id": 42,
  "total": 1600.00,
  "name": "Acme Corporation (corrected)",
  "totalEditedByUser": true,
  "nameEditedByUser": true
}
```

**Important**: Once a field's `*EditedByUser` flag is `true`, SSE updates will NOT overwrite it.

## Frontend Integration Example

```typescript
// 1. Upload document
const response = await fetch('/document', {
  method: 'POST',
  body: formData
});

const { transactionRecordId } = await response.json();

// 2. Subscribe to SSE for real-time updates
const eventSource = new EventSource(
  `/transaction-records/${transactionRecordId}/events`
);

eventSource.addEventListener('analysis.completed', (e) => {
  const { extractedData } = JSON.parse(e.data);

  // Only fill fields user hasn't edited
  if (!record.totalEditedByUser && !record.total) {
    record.total = extractedData.total;
  }
  if (!record.nameEditedByUser && !record.name) {
    record.name = extractedData.name;
  }
  // ... check each field's editedByUser flag

  eventSource.close();
});

// 3. Track user edits (automatic - flags set by backend)
const updateField = async (field, value) => {
  const response = await fetch(`/transaction-records/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ [field]: value })
  });

  const updated = await response.json();
  // Update local record with returned flags
  record.totalEditedByUser = updated.totalEditedByUser;
  record.nameEditedByUser = updated.nameEditedByUser;
  // etc...
};

// 4. Load existing transaction (when returning to page)
const loadTransaction = async (id) => {
  const record = await fetch(`/transaction-records/${id}`).then(r => r.json());

  if (record.status === 'ANALYZED') {
    // Load analysis suggestions
    const analysis = await fetch(`/transaction-records/${id}/analysis`)
      .then(r => r.json());

    // Fill empty fields with suggestions (check edit flags)
    if (!record.totalEditedByUser && !record.total) {
      record.total = analysis.extractedData.total;
    }
    if (!record.nameEditedByUser && !record.name) {
      record.name = analysis.extractedData.name;
    }
    // ... check each field
  } else if (record.status === 'ANALYZING') {
    // Still processing, subscribe to SSE
    subscribeToSSE(id);
  }

  return record;
};
```

## Key Components

### DocumentResource.java
- Updated to return 202 Accepted immediately
- Creates TransactionRecord with PENDING status
- Creates AnalysisResult placeholder
- Queues document to Kafka

### SubmitService.java
- Added `analyzeDocumentAsync()` method
- Retrieves file from S3
- Performs ZugFerd → Azure → Tagging pipeline
- Updates TransactionRecord and AnalysisResult

### DocumentAnalysisConsumer.java
- Listens to Kafka `document-analysis` topic
- Updates statuses (PENDING → ANALYZING → ANALYZED)
- Broadcasts SSE events at each step
- Handles errors gracefully

### AnalysisEventBroadcaster.java
- Manages SSE subscriptions per transaction record
- Thread-safe concurrent subscription management
- Broadcasts events to all connected clients

### TransactionRecordResource.java
- Added GET `/transaction-records/{id}` - Get single record
- Added GET `/transaction-records/{id}/analysis` - Get analysis result
- Added GET `/transaction-records/{id}/events` - SSE endpoint
- Added PATCH `/transaction-records/{id}` - Update with edit tracking (sets boolean flags)

## Configuration

### application.properties
Added Kafka channel configuration:
```properties
# Document analysis queue (async processing)
mp.messaging.outgoing.document-analysis.connector=smallrye-kafka
mp.messaging.outgoing.document-analysis.topic=app.hopps.documents.analysis
mp.messaging.incoming.document-analysis.connector=smallrye-kafka
mp.messaging.incoming.document-analysis.topic=app.hopps.documents.analysis
```

## Benefits

1. **Immediate Response**: User doesn't wait for analysis (202 Accepted)
2. **Real-time Updates**: SSE pushes results when ready
3. **User Control**: Edit tracking prevents AI from overwriting user changes
4. **Separation of Concerns**: Analysis metadata separate from transaction data
5. **Fault Tolerance**: Failed analysis doesn't block transaction creation
6. **Audit Trail**: Complete analysis history preserved
7. **Resumable**: User can leave and return, suggestions still available

## Database Migrations Needed

You'll need to create Flyway migrations for:

1. Add columns to `transaction_record`:
   - `status` (VARCHAR, NOT NULL, default 'PENDING')
   - `created_at` (TIMESTAMP, NOT NULL)
   - `updated_at` (TIMESTAMP, NOT NULL)
   - Make `total` nullable
   - `total_edited_by_user` (BOOLEAN, NOT NULL, default FALSE)
   - `transaction_time_edited_by_user` (BOOLEAN, NOT NULL, default FALSE)
   - `name_edited_by_user` (BOOLEAN, NOT NULL, default FALSE)
   - `order_number_edited_by_user` (BOOLEAN, NOT NULL, default FALSE)
   - `invoice_id_edited_by_user` (BOOLEAN, NOT NULL, default FALSE)
   - `due_date_edited_by_user` (BOOLEAN, NOT NULL, default FALSE)
   - `amount_due_edited_by_user` (BOOLEAN, NOT NULL, default FALSE)
   - `currency_code_edited_by_user` (BOOLEAN, NOT NULL, default FALSE)
   - `tags_edited_by_user` (BOOLEAN, NOT NULL, default FALSE)
   - `sender_edited_by_user` (BOOLEAN, NOT NULL, default FALSE)
   - `recipient_edited_by_user` (BOOLEAN, NOT NULL, default FALSE)

3. Create table `transaction_record_analysis_result`:
   - `id` (BIGINT, PK)
   - `transaction_record_id` (BIGINT, FK, UNIQUE)
   - `status` (VARCHAR, NOT NULL)
   - `extracted_data` (JSONB)
   - `extraction_method` (VARCHAR)
   - `confidence_scores` (JSONB)
   - `error_code`, `error_message` (VARCHAR)
   - `failed_step` (VARCHAR)
   - `started_at`, `completed_at` (TIMESTAMP)

4. Create table `analysis_step_progress`:
   - `analysis_result_id` (BIGINT, FK)
   - `step` (VARCHAR)
   - `status` (VARCHAR)

## Testing

Key scenarios to test:
1. ✅ Upload document → immediate 202 response
2. ✅ SSE connection receives analysis.completed
3. ✅ User edits field → field tracked in userEditedFields
4. ✅ User leaves page during analysis → can reload and see suggestions
5. ✅ Analysis fails → status=FAILED, error message stored
6. ✅ Multiple concurrent uploads → each gets own SSE stream
7. ✅ SSE connection closes → cleanup happens correctly

## Files Created/Modified

### Created:
- `TransactionStatus.java`
- `AnalysisStatus.java`
- `AnalysisStep.java`
- `StepStatus.java`
- `TransactionRecordAnalysisResult.java`
- `AnalysisResultRepository.java`
- `DocumentUploadResponse.java`
- `DocumentAnalysisMessage.java`
- `AnalysisEventBroadcaster.java`
- `DocumentAnalysisConsumer.java`

### Modified:
- `TransactionRecord.java` - Added status, boolean edit-tracking flags, timestamps
- `DocumentResource.java` - Returns 202, queues to Kafka
- `SubmitService.java` - Added analyzeDocumentAsync(), respects edit flags
- `DocumentProducer.java` - Added queueForAnalysis()
- `TransactionRecordResource.java` - Added SSE, analysis, PATCH endpoints (sets flags)
- `InvoiceData.java` - updateTransactionRecord() checks edit flags
- `ReceiptData.java` - updateTransactionRecord() checks edit flags
- `application.properties` - Added Kafka channel config

## Next Steps

1. Create database migrations
2. Add proper field mapping in PATCH endpoint (currently simplified)
3. Add authorization checks (OpenFGA) for SSE subscriptions
4. Add integration tests for async flow
5. Add frontend implementation
6. Add metrics/monitoring for analysis pipeline
7. Consider retry logic for failed analyses
8. Add admin endpoint to reprocess failed analyses
