---
sidebar_position: 2
---

# TypeScript Consumer API

The Consumer API allows you to download and subscribe to datasets on the Helix Connect platform.

## Initialize Consumer

```typescript
import { HelixConsumer } from '@helix-tools/sdk-typescript';

const consumer = new HelixConsumer({
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  customerId: process.env.HELIX_CUSTOMER_ID!,
});
```

## List Available Datasets

```typescript
// List all datasets you have access to
const datasets = await consumer.listDatasets();

for (const ds of datasets) {
  console.log(`${ds.id}: ${ds.name}`);
  console.log(`  Description: ${ds.description}`);
  console.log(`  Freshness: ${ds.dataFreshness}`);
  console.log(`  Last Updated: ${ds.updatedAt}`);
}
```

## Download a Dataset

```typescript
// Simple download
await consumer.downloadDataset({
  datasetId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  outputPath: './data/my_dataset.csv',
});

// Download with progress tracking
await consumer.downloadDataset({
  datasetId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  outputPath: './data/my_dataset.csv',
  onProgress: (transferred, total) => {
    const percent = ((transferred / total) * 100).toFixed(1);
    process.stdout.write(`\rDownloading: ${percent}%`);
  },
});
```

## Subscribe to Dataset Updates

```typescript
// Subscribe to a dataset
await consumer.subscribeToDataset({
  datasetId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
});

// List your subscriptions
const subscriptions = await consumer.listSubscriptions();
```

## Poll for Notifications

Receive notifications when subscribed datasets are updated:

```typescript
// Basic polling
const notifications = await consumer.pollNotifications({
  maxMessages: 10,
  waitTimeSeconds: 20, // Long polling
});

for (const notification of notifications) {
  console.log(`Dataset ${notification.datasetId} was updated`);
  console.log(`New version: ${notification.version}`);
}

// Auto-download on notification
const notifications = await consumer.pollNotifications({
  maxMessages: 10,
  waitTimeSeconds: 20,
  autoDownload: true,
  outputDir: './downloads',
});
```

## Continuous Notification Listener

```typescript
// Start a continuous listener
const stopListener = consumer.startNotificationListener({
  outputDir: './downloads',
  onNotification: (notification) => {
    console.log(`Received update for ${notification.datasetId}`);
  },
  onDownload: (datasetId, path) => {
    console.log(`Downloaded ${datasetId} to ${path}`);
  },
  onError: (error) => {
    console.error('Listener error:', error);
  },
});

// Stop listener when done
process.on('SIGINT', () => {
  stopListener();
  process.exit(0);
});
```

## Error Handling

```typescript
import {
  AuthenticationError,
  PermissionDeniedError,
  DatasetNotFoundError,
  RateLimitError,
  HelixError,
} from '@helix-tools/sdk-typescript';

try {
  await consumer.downloadDataset({
    datasetId: 'some-dataset-id',
    outputPath: './data/output.csv',
  });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Invalid AWS credentials');
  } else if (error instanceof PermissionDeniedError) {
    console.error('No access to this dataset - subscribe first');
  } else if (error instanceof DatasetNotFoundError) {
    console.error('Dataset does not exist');
  } else if (error instanceof RateLimitError) {
    console.error(`Rate limit exceeded - retry after ${error.retryAfter}s`);
  } else if (error instanceof HelixError) {
    console.error(`Helix error: ${error.message}`);
  } else {
    throw error;
  }
}
```

## Next Steps

- [Producer API](/typescript/producer) - Upload and manage datasets
- [Getting Started](/) - Overview of all SDKs
