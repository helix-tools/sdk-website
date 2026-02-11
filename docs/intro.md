---
sidebar_position: 1
slug: /
---

# Getting Started with Helix SDKs

Welcome to the **Helix Connect SDK Documentation**. This site provides comprehensive guides for integrating with the Helix Connect Data Marketplace using our official SDKs.

## What is Helix Connect?

Helix Connect is a secure, scalable platform for exchanging datasets between data producers and consumers. Our SDKs make it easy to:

- **Download datasets** you've subscribed to
- **Upload datasets** as a producer
- **Receive notifications** when datasets are updated
- **Manage subscriptions** and access control

## Available SDKs

| SDK | Language | Status | Installation |
|-----|----------|--------|-------------|
| [TypeScript](/typescript/installation) | TypeScript/Node.js | Production | `npm install @helix-tools/sdk-typescript` |
| [Python](/python/installation) | Python 3.8+ | Production | `pip install helix-connect` |
| [Go](/go/installation) | Go 1.21+ | Production | `go get github.com/helix-tools/sdk-go` |

## Key Features

### Security First

All SDKs implement:
- **AWS SigV4 authentication** for API requests
- **AES-256-GCM envelope encryption** for data at rest
- **Compress-then-encrypt pipeline** with ~90% space savings
- **KMS-backed key management**

### Role-Based Access

```
HelixConsumer (base class)
    ↓
HelixProducer (adds upload capabilities)
    ↓
HelixAdmin (adds platform management)
```

Each class inherits all capabilities from its parent:
- **Consumers** can download and subscribe to datasets
- **Producers** can also upload datasets
- **Admins** can manage customers and platform settings

### Notifications

Subscribe to dataset updates and receive real-time notifications:
- SQS-based message queue
- Long-polling support
- Auto-download on notification

## Quick Start

### 1. Get Your Credentials

Contact [support@helix.tools](mailto:support@helix.tools) to obtain:
- AWS Access Key ID
- AWS Secret Access Key
- Customer ID (UUID format)

### 2. Install an SDK

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="ts" label="TypeScript">

```bash
npm install @helix-tools/sdk-typescript
```

</TabItem>
<TabItem value="py" label="Python">

```bash
pip install helix-connect
```

</TabItem>
<TabItem value="go" label="Go">

```bash
go get github.com/helix-tools/sdk-go
```

</TabItem>
</Tabs>

### 3. Connect and Download

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { HelixConsumer } from '@helix-tools/sdk-typescript';

const consumer = new HelixConsumer({
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  customerId: process.env.HELIX_CUSTOMER_ID!,
});

// List available datasets
const datasets = await consumer.listDatasets();

// Download a dataset
await consumer.downloadDataset({
  datasetId: 'your-dataset-id',
  outputPath: './data/my_dataset.csv',
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
from helix_connect import HelixConsumer

consumer = HelixConsumer(
    aws_access_key_id="your-access-key",
    aws_secret_access_key="your-secret-key",
    customer_id="your-customer-id"
)

# List available datasets
datasets = consumer.list_datasets()

# Download a dataset
consumer.download_dataset(
    dataset_id="your-dataset-id",
    output_path="./data/my_dataset.csv"
)
```

</TabItem>
<TabItem value="go" label="Go">

```go
import "github.com/helix-tools/sdk-go"

consumer, err := helix.NewConsumer(&helix.Config{
    AWSAccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
    AWSSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
    CustomerID:         os.Getenv("HELIX_CUSTOMER_ID"),
})

// List available datasets
datasets, err := consumer.ListDatasets()

// Download a dataset
err = consumer.DownloadDataset("your-dataset-id", "./data/my_dataset.csv")
```

</TabItem>
</Tabs>

## Next Steps

- **TypeScript developers**: Start with [TypeScript Installation](/typescript/installation)
- **Python developers**: Start with [Python Installation](/python/installation)
- **Go developers**: Start with [Go Installation](/go/installation)

## Support

- **Documentation**: You're reading it!
- **GitHub Issues**: [github.com/helix-tools/sdk-docs/issues](https://github.com/helix-tools/sdk-docs/issues)
- **Email**: [support@helix.tools](mailto:support@helix.tools)
