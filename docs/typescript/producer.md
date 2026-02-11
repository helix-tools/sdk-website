---
sidebar_position: 3
---

# TypeScript Producer API

The Producer API allows you to upload and manage datasets on the Helix Connect platform. Producers also have all Consumer capabilities.

## Initialize Producer

```typescript
import { HelixProducer } from '@helix-tools/sdk-typescript';

const producer = new HelixProducer({
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  customerId: process.env.HELIX_CUSTOMER_ID!,
});
```

:::info
HelixProducer extends HelixConsumer, so you can use all consumer methods (listDatasets, downloadDataset, etc.) with a producer instance.
:::

## Upload a Dataset

```typescript
// Simple upload
const result = await producer.uploadDataset({
  filePath: './data/my_dataset.csv',
  datasetName: 'my-awesome-dataset',
  description: 'Q4 2024 sales data',
  dataFreshness: 'daily',
});

console.log(`Uploaded dataset: ${result.datasetId}`);

// Upload with progress tracking
await producer.uploadDataset({
  filePath: './data/my_dataset.csv',
  datasetName: 'my-awesome-dataset',
  description: 'Q4 2024 sales data',
  dataFreshness: 'daily',
  onProgress: (transferred, total) => {
    const percent = ((transferred / total) * 100).toFixed(1);
    process.stdout.write(`\rUploading: ${percent}%`);
  },
});
```

## Update an Existing Dataset

```typescript
// Update with new data
await producer.updateDataset({
  datasetId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  filePath: './data/updated_dataset.csv',
});

// Update metadata only
await producer.updateDatasetMetadata({
  datasetId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  description: 'Updated description',
  dataFreshness: 'weekly',
});
```

## List Your Datasets

```typescript
// List datasets you've uploaded
const myDatasets = await producer.listMyDatasets();

for (const ds of myDatasets) {
  console.log(`${ds.id}: ${ds.name}`);
  console.log(`  Downloads: ${ds.downloadCount}`);
  console.log(`  Subscribers: ${ds.subscriberCount}`);
}
```

## Delete a Dataset

```typescript
// Delete a dataset (requires confirmation)
await producer.deleteDataset({
  datasetId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  confirm: true,
});
```

:::warning
Deleting a dataset is permanent and will remove all versions. Subscribers will no longer have access.
:::

## Data Freshness Options

When uploading, specify how frequently the data is updated:

| Value | Description |
|-------|-------------|
| `realtime` | Continuously updated |
| `hourly` | Updated every hour |
| `daily` | Updated once per day |
| `weekly` | Updated once per week |
| `monthly` | Updated once per month |
| `quarterly` | Updated once per quarter |
| `static` | No planned updates |

## Compression & Encryption

The SDK automatically handles:

1. **Compression**: Gzip compression (configurable levels 1-9)
2. **Encryption**: AES-256-GCM envelope encryption
3. **Key Management**: AWS KMS for secure key storage

```typescript
// Configure compression level
const producer = new HelixProducer({
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  customerId: process.env.HELIX_CUSTOMER_ID!,
  compressionLevel: 6, // 1=fastest, 9=best compression
});
```

### Compression Performance

Based on real-world testing:

| Data Type | Original Size | Compressed | Savings |
|-----------|--------------|------------|---------|
| JSON (user data) | 92 KB | 8 KB | **90.9%** |
| CSV (sales data) | 150 KB | 18 KB | **88.0%** |
| XML (config) | 45 KB | 6 KB | **86.7%** |

## Error Handling

```typescript
import {
  UploadError,
  ValidationError,
  QuotaExceededError,
  HelixError,
} from '@helix-tools/sdk-typescript';

try {
  await producer.uploadDataset({
    filePath: './data/my_dataset.csv',
    datasetName: 'my-dataset',
    description: 'Dataset description',
    dataFreshness: 'daily',
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Invalid dataset:', error.validationErrors);
  } else if (error instanceof QuotaExceededError) {
    console.error('Storage quota exceeded');
  } else if (error instanceof UploadError) {
    console.error('Upload failed:', error.message);
  } else if (error instanceof HelixError) {
    console.error('Helix error:', error.message);
  } else {
    throw error;
  }
}
```

## Next Steps

- [Consumer API](/typescript/consumer) - Download and subscribe to datasets
- [Getting Started](/) - Overview of all SDKs
