---
sidebar_position: 4
---

# TypeScript Admin API

The Admin API provides platform management capabilities for organization administrators. Admins have full access to Consumer and Producer functionality plus additional management features.

:::info
The Admin API is only available to users with administrator privileges. Contact [support@helix.tools](mailto:support@helix.tools) to request admin access.
:::

## Initialize Admin

```typescript
import { HelixAdmin } from '@helix-tools/sdk-typescript';

const admin = new HelixAdmin({
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  customerId: process.env.HELIX_CUSTOMER_ID!,
});
```

## Class Hierarchy

```
HelixConsumer (base class)
    ↓
HelixProducer (adds upload capabilities)
    ↓
HelixAdmin (adds platform management)
```

HelixAdmin inherits all methods from HelixProducer and HelixConsumer.

## Customer Management

### Create a Customer

```typescript
const customer = await admin.createCustomer({
  customerName: 'Acme Corporation',
  contactEmail: 'data@acme.com',
  plan: 'enterprise',
  metadata: {
    industry: 'financial-services',
    region: 'us-east',
  },
});

console.log(`Created customer: ${customer.id}`);
console.log(`API Keys: ${customer.accessKeyId}`);
```

### List All Customers

```typescript
const customers = await admin.listCustomers();

for (const customer of customers) {
  console.log(`${customer.name} (${customer.id})`);
  console.log(`  Email: ${customer.contactEmail}`);
  console.log(`  Plan: ${customer.plan}`);
  console.log(`  Datasets: ${customer.datasetCount}`);
  console.log(`  Created: ${customer.createdAt}`);
}
```

### Get Customer Details

```typescript
const customer = await admin.getCustomer({
  customerId: 'customer-uuid-here',
});

console.log(JSON.stringify(customer, null, 2));
```

### Update Customer

```typescript
await admin.updateCustomer({
  customerId: 'customer-uuid-here',
  contactEmail: 'new-email@acme.com',
  plan: 'premium',
});
```

### Deactivate Customer

```typescript
await admin.deactivateCustomer({
  customerId: 'customer-uuid-here',
  reason: 'Account closed',
});
```

## Credential Management

### Rotate Customer Credentials

```typescript
const newCredentials = await admin.rotateCredentials({
  customerId: 'customer-uuid-here',
});

console.log(`New Access Key: ${newCredentials.accessKeyId}`);
console.log(`New Secret Key: ${newCredentials.secretAccessKey}`);
// Securely deliver these to the customer
```

### List Active API Keys

```typescript
const keys = await admin.listApiKeys({
  customerId: 'customer-uuid-here',
});

for (const key of keys) {
  console.log(`${key.accessKeyId}: ${key.status}`);
  console.log(`  Created: ${key.createdAt}`);
  console.log(`  Last Used: ${key.lastUsedAt || 'Never'}`);
}
```

### Revoke API Key

```typescript
await admin.revokeApiKey({
  accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
});
```

## Platform Statistics

### Get Overview Statistics

```typescript
const stats = await admin.getPlatformStats();

console.log('Platform Overview:');
console.log(`  Total Customers: ${stats.totalCustomers}`);
console.log(`  Active Customers: ${stats.activeCustomers}`);
console.log(`  Total Datasets: ${stats.totalDatasets}`);
console.log(`  Total Storage: ${formatBytes(stats.totalStorageBytes)}`);
console.log(`  Downloads Today: ${stats.downloadsToday}`);
console.log(`  Uploads Today: ${stats.uploadsToday}`);

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}
```

### Get Usage by Customer

```typescript
const usage = await admin.getCustomerUsage({
  customerId: 'customer-uuid-here',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});

console.log(`Customer: ${usage.customerName}`);
console.log(`Datasets Created: ${usage.datasetsCreated}`);
console.log(`Uploads: ${usage.uploadCount} (${formatBytes(usage.uploadBytes)})`);
console.log(`Downloads: ${usage.downloadCount} (${formatBytes(usage.downloadBytes)})`);
```

### Export Usage Report

```typescript
const report = await admin.exportUsageReport({
  startDate: '2024-01-01',
  endDate: '2024-03-31',
  format: 'csv',
  groupBy: 'customer',
});

// Save report to file
await fs.promises.writeFile('./usage-report-q1.csv', report);
```

## Dataset Management

### List All Platform Datasets

```typescript
const allDatasets = await admin.listAllDatasets();

for (const ds of allDatasets) {
  console.log(`${ds.name} (${ds.id})`);
  console.log(`  Owner: ${ds.ownerCustomerId}`);
  console.log(`  Size: ${formatBytes(ds.sizeBytes)}`);
  console.log(`  Downloads: ${ds.totalDownloads}`);
  console.log(`  Subscribers: ${ds.subscriberCount}`);
}
```

### Force Delete Dataset

:::danger
This action permanently deletes a dataset and cannot be undone. All subscribers will lose access.
:::

```typescript
await admin.forceDeleteDataset({
  datasetId: 'dataset-uuid-here',
  reason: 'Violates terms of service',
  confirm: true,
});
```

### Transfer Dataset Ownership

```typescript
await admin.transferDataset({
  datasetId: 'dataset-uuid-here',
  newOwnerId: 'new-customer-uuid',
  notifySubscribers: true,
});
```

## Audit Logs

### Query Audit Logs

```typescript
const logs = await admin.queryAuditLogs({
  startTime: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  endTime: new Date(),
  eventTypes: ['DOWNLOAD', 'UPLOAD', 'LOGIN'],
  customerId: 'customer-uuid-here', // Optional: filter by customer
  limit: 100,
});

for (const log of logs) {
  console.log(`[${log.timestamp}] ${log.eventType}`);
  console.log(`  User: ${log.userId}`);
  console.log(`  Resource: ${log.resourceId}`);
  console.log(`  IP: ${log.sourceIp}`);
}
```

### Export Audit Logs

```typescript
const exportJob = await admin.exportAuditLogs({
  startTime: new Date('2024-01-01'),
  endTime: new Date('2024-03-31'),
  format: 'json',
  destination: 's3://my-bucket/audit-logs/',
});

console.log(`Export job started: ${exportJob.id}`);
console.log(`Status: ${exportJob.status}`);
```

## Error Handling

```typescript
import {
  AdminPermissionError,
  CustomerNotFoundError,
  QuotaExceededError,
  HelixError,
} from '@helix-tools/sdk-typescript';

try {
  await admin.createCustomer({
    customerName: 'New Corp',
    contactEmail: 'data@newcorp.com',
    plan: 'enterprise',
  });
} catch (error) {
  if (error instanceof AdminPermissionError) {
    console.error('Admin privileges required for this operation');
  } else if (error instanceof QuotaExceededError) {
    console.error('Platform customer quota exceeded');
  } else if (error instanceof HelixError) {
    console.error(`Admin error: ${error.message}`);
  } else {
    throw error;
  }
}
```

## Best Practices

1. **Least Privilege**: Use Consumer or Producer clients when admin access isn't needed
2. **Audit Everything**: Log all admin operations with business justification
3. **Secure Credentials**: Admin credentials should be stored in secure vaults
4. **Rate Limits**: Admin operations have stricter rate limits; batch where possible
5. **Test in Staging**: Always test admin operations in staging environment first

## Next Steps

- [Consumer API](/typescript/consumer) — Download and subscribe to datasets
- [Producer API](/typescript/producer) — Upload and manage datasets
- [Common Patterns](/common-patterns) — Integration recipes
