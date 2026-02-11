---
sidebar_position: 1
---

# TypeScript Installation

The official TypeScript/Node.js SDK for the Helix Connect data marketplace platform.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- AWS credentials (provided during customer onboarding)
- Helix Connect customer ID (UUID format)

## Installation

```bash
npm install @helix-tools/sdk-typescript
```

Or with yarn:

```bash
yarn add @helix-tools/sdk-typescript
```

## Configuration

### Environment Variables

Create a `.env` file in your project:

```bash
# Required
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
HELIX_CUSTOMER_ID=your-customer-id

# Optional
HELIX_API_ENDPOINT=https://api-go.helix.tools
HELIX_REGION=us-east-1
```

### Programmatic Configuration

```typescript
import { HelixConsumer } from '@helix-tools/sdk-typescript';

const consumer = new HelixConsumer({
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  customerId: process.env.HELIX_CUSTOMER_ID!,
  
  // Optional
  apiEndpoint: 'https://api-go.helix.tools',
  region: 'us-east-1',
});
```

## Verify Installation

```typescript
import { HelixConsumer } from '@helix-tools/sdk-typescript';

async function verify() {
  const consumer = new HelixConsumer({
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    customerId: process.env.HELIX_CUSTOMER_ID!,
  });

  // This will validate credentials on connection
  const datasets = await consumer.listDatasets();
  console.log(`Connected! Found ${datasets.length} datasets.`);
}

verify().catch(console.error);
```

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** or AWS Secrets Manager
3. **Rotate credentials** regularly
4. **Use IAM roles** when running on AWS infrastructure
5. **Set appropriate file permissions** on `.env` files

## Next Steps

- [Consumer API](/typescript/consumer) - Download and subscribe to datasets
- [Producer API](/typescript/producer) - Upload and manage datasets
