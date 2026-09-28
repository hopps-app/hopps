# ZUGFeRD Service

ZUGFeRD (Zentraler User Guide des Forums elektronische Rechnung Deutschland) is a German e-invoicing standard that embeds structured XML invoice data within PDF documents. This service extracts and processes the embedded invoice data from ZUGFeRD-compliant PDFs.

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your credentials in `.env` (optional, see below)

### Azure OpenAI (Optional)

The service can use Azure OpenAI for document tagging. We deliberately use Azure's
EU-hosted OpenAI models rather than `api.openai.com`, so document contents never
leave the EU:
1. Create an **Azure OpenAI** resource in an EU region (we use **West Europe**)
2. Deploy a `gpt-4o-mini` model in Azure AI Foundry > **Deployments**, choosing the
   **DataZoneStandard** deployment type so inference stays inside the EU data zone.
   Do *not* pick GlobalStandard - that routes inference worldwide, including the US.
3. Copy the resource name, the deployment name and one of the **Keys** into your `.env` file

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `HOPPS_AZURE_OPENAI_RESOURCE_NAME` | No | Azure OpenAI resource name (EU region) |
| `HOPPS_AZURE_OPENAI_DEPLOYMENT_NAME` | No | Model deployment name, defaults to `gpt-4o-mini` |
| `HOPPS_AZURE_OPENAI_KEY` | No | Azure OpenAI API key for tagging |
| `HOPPS_AZURE_OPENAI_API_VERSION` | No | Azure OpenAI API version, defaults to `2024-10-21` |

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
