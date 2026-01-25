# ZUGFeRD Service

ZUGFeRD (Zentraler User Guide des Forums elektronische Rechnung Deutschland) is a German e-invoicing standard that embeds structured XML invoice data within PDF documents. This service extracts and processes the embedded invoice data from ZUGFeRD-compliant PDFs.

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your credentials in `.env` (optional, see below)

### OpenAI API Key (Optional)

The service can use OpenAI for enhanced document tagging:
1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add it to your `.env` file

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | No | OpenAI API key for enhanced tagging |

### Service Configuration

- **Port (dev):** 8103
- **API Path:** `/api/zugferd`

## API Endpoints

### POST `/api/zugferd/document/scan`

Uploads and processes a ZUGFeRD invoice PDF, extracting its embedded XML data.

**Request:**
- Content-Type: `multipart/form-data`
- `document`: The ZUGFeRD PDF file to process
- `transactionRecordId`: ID for tracking the transaction

**Response:** `DocumentData` object containing extracted invoice data

**Status Codes:**
- `200`: Document successfully processed
- `422`: Invalid PDF file or parsing error

## How It Works

The service uses the [Mustang Project](https://www.mustangproject.org/) library to:
1. Read the uploaded PDF file
2. Extract the embedded ZUGFeRD XML data
3. Parse the XML into structured invoice data
4. Return the data as a JSON response

### Note on Calculation Errors

When extracting invoice data, there may be minor calculation differences between the embedded XML totals and recalculated values. The service handles these gracefully and logs any discrepancies.

## Running the Application

### Development Mode

```bash
./mvnw compile quarkus:dev
```

> **Note:** Quarkus Dev UI is available at http://localhost:8103/q/dev/

### Packaging

```bash
./mvnw package
```

Run with:
```bash
java -jar target/quarkus-app/quarkus-run.jar
```

### Native Executable

```bash
./mvnw package -Dnative
```

Or build in a container (no GraalVM required):
```bash
./mvnw package -Dnative -Dquarkus.native.container-build=true
```
