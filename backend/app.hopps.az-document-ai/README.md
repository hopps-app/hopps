# Azure Document AI Service

Intelligent document data extraction service using Azure Document Intelligence. This service processes uploaded documents (invoices, receipts) and extracts structured data like vendor information, amounts, dates, and line items.

## Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Azure credentials in `.env` (see below for how to obtain them)

### Getting Azure Credentials

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new **Document Intelligence** resource (or use an existing one)
3. Navigate to **Keys and Endpoint** in the resource menu
4. Copy the **Endpoint** URL and one of the **Keys**
5. Paste them into your `.env` file

### Azure OpenAI (Optional)

The service uses Azure OpenAI for document tagging. We deliberately use Azure's
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
| `HOPPS_AZURE_DOCUMENT_AI_ENDPOINT` | Yes | Azure Document Intelligence endpoint URL |
| `HOPPS_AZURE_DOCUMENT_AI_KEY` | Yes | Azure Document Intelligence API key |
| `HOPPS_AZURE_OPENAI_RESOURCE_NAME` | No | Azure OpenAI resource name (EU region) |
| `HOPPS_AZURE_OPENAI_DEPLOYMENT_NAME` | No | Model deployment name, defaults to `gpt-4o-mini` |
| `HOPPS_AZURE_OPENAI_KEY` | No | Azure OpenAI API key for tagging |
| `HOPPS_AZURE_OPENAI_API_VERSION` | No | Azure OpenAI API version, defaults to `2024-10-21` |

### Service Configuration

- **Port (dev):** 8100
- **API Path:** `/api/az-document-ai`
- **Model:** `prebuilt-invoice` (Azure's pretrained invoice model)
- **Max Upload Size:** 4MB

## API Endpoints

### POST `/document/scan`

Scans an uploaded document and extracts structured data.

**Request:**
- Content-Type: `multipart/form-data`
- `document`: The PDF/image file to scan
- `transactionRecordId`: ID for tracking the transaction

**Response:** `DocumentData` object containing extracted invoice data

**Status Codes:**
- `200`: Successfully extracted document data
- `400`: Could not extract data / invalid request

## Running the Application

### Development Mode

```bash
./mvnw compile quarkus:dev
```

> **Note:** Quarkus Dev UI is available at http://localhost:8100/q/dev/

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
