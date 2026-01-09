# @hopps/api-client

The hopps API client library for interacting with the hopps backend services.

## Description

This package provides a TypeScript client for the hopps API, allowing you to easily interact with the backend services from your frontend application. It includes auto-generated clients for the hopps-app service and other API endpoints.

## Installation

```bash
npm install @hopps/api-client
```

## Usage

```typescript
import { createApiService } from '@hopps/api-client';

// Create an API service instance
const apiService = createApiService({
  hoppsAppBaseUrl: 'https://api.hopps.cloud',
  getAccessToken: () => localStorage.getItem('access_token'),
  refreshToken: async () => {
    // Implement your token refresh logic here
    const response = await fetch('https://auth.hopps.cloud/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: localStorage.getItem('refresh_token'),
      }),
    });

    const data = await response.json();
    localStorage.setItem('access_token', data.access_token);
    return true;
  },
});

// Use the API service
async function getBommels() {
  try {
    const bommels = await apiService.hoppsApp.getBommels();
    console.log(bommels);
  } catch (error) {
    console.error('Failed to get bommels:', error);
  }
}
```

## Generating the Hopps App Service Client

The hopps-app service client (`HoppsAppService.ts`) is auto-generated from the OpenAPI specification using [NSwag](https://github.com/RicoSuter/NSwag). To regenerate the client after changes to the API, run:

```bash
npm run generate:hopps-app
```

This command uses the OpenAPI specification from `https://api.dev.hopps.cloud/q/openapi?format=json` by default.

## Providing a Custom OpenAPI Specification

If you want to use a different OpenAPI specification for generating the client, you can:

### Option 1: Modify the package.json script

Edit the `generate:hopps-app` script in `package.json` to point to your custom OpenAPI specification:

```json
"scripts": {
  "generate:hopps-app": "nswag openapi2tsclient /input:path/to/your/openapi.json /output:./src/services/HoppsAppService.ts"
}
```

### Option 2: Use a local file

1. Save your OpenAPI specification to a local file
2. Run the nswag command directly:

```bash
npx nswag openapi2tsclient /input:path/to/your/openapi.json /output:./src/services/HoppsAppService.ts
```

### Option 3: Use a URL

You can also generate the client from an OpenAPI specification available at a URL:

```bash
npx nswag openapi2tsclient /input:http://your-api-server/v3/api-docs /output:./src/services/HoppsAppService.ts
```

## Configuration

The client generation is configured in the `hopps-app.nswag` file. You can modify this file to change the generation options, such as:

- The TypeScript version
- The HTTP client template
- Naming conventions
- Type generation options

After modifying the configuration, regenerate the client using the command above.

## Development

To build the package:

```bash
npm run build
```

To publish the package:

```bash
npm run release
```

## License

MIT