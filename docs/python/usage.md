---
sidebar_position: 2
---

# Python Usage Guide

Complete guide to using the Helix Connect Python SDK for consuming and producing datasets.

## Class Hierarchy

```
HelixConsumer (base class)
    ↓
HelixProducer (adds upload capabilities)
    ↓
HelixAdmin (adds platform management)
```

Each class inherits all capabilities from its parent:
- **Producers** can also consume data
- **Admins** can produce and consume data

## Consumer API

### Initialize Consumer

```python
from helix_connect import HelixConsumer

consumer = HelixConsumer(
    aws_access_key_id="your-access-key",
    aws_secret_access_key="your-secret-key",
    customer_id="your-customer-id"
)
```

### List Available Datasets

```python
datasets = consumer.list_datasets()
for ds in datasets:
    print(f"{ds['name']}: {ds['description']}")
```

### Download a Dataset

```python
# Simple download
consumer.download_dataset(
    dataset_id="a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    output_path="./data/my_dataset.csv"
)

# Download with progress tracking
def progress_callback(bytes_transferred, total_bytes):
    percent = (bytes_transferred / total_bytes) * 100
    print(f"Progress: {percent:.1f}%")

consumer.download_dataset(
    dataset_id="a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    output_path="./data/my_dataset.csv",
    progress_callback=progress_callback
)
```

### Subscribe to Dataset Updates

```python
# Subscribe to a dataset
consumer.subscribe_to_dataset(dataset_id="...")

# Poll for notifications (long-polling with auto-download)
notifications = consumer.poll_notifications(
    max_messages=10,
    wait_time=20,  # seconds
    auto_download=True,
    output_dir="./downloads"
)
```

## Producer API

### Initialize Producer

```python
from helix_connect import HelixProducer

# Initialize producer (inherits all consumer capabilities)
producer = HelixProducer(
    aws_access_key_id="your-access-key",
    aws_secret_access_key="your-secret-key",
    customer_id="your-customer-id"
)
```

### Upload a Dataset

```python
def progress_callback(bytes_transferred, total_bytes):
    percent = (bytes_transferred / total_bytes) * 100
    print(f"Progress: {percent:.1f}%")

producer.upload_dataset(
    file_path="./data/my_dataset.csv",
    dataset_name="my-awesome-dataset",
    description="Q4 2024 sales data",
    data_freshness="daily",
    progress_callback=progress_callback
)
```

### Update Existing Dataset

```python
producer.update_dataset(
    dataset_id="...",
    file_path="./data/updated_dataset.csv"
)
```

### List Your Datasets

```python
my_datasets = producer.list_my_datasets()
for ds in my_datasets:
    print(f"{ds['name']}: {ds['download_count']} downloads")
```

## Admin API

For platform administrators:

```python
from helix_connect import HelixAdmin

admin = HelixAdmin(
    aws_access_key_id="admin-access-key",
    aws_secret_access_key="admin-secret-key",
    customer_id="admin-customer-id"
)

# Create new customer
customer = admin.create_customer(
    customer_name="Acme Corp",
    contact_email="data@acme.com"
)

# List all customers
customers = admin.list_customers()

# Get platform statistics
stats = admin.get_platform_stats()
print(f"Total datasets: {stats['total_datasets']}")
print(f"Total customers: {stats['total_customers']}")
```

## Error Handling

```python
from helix_connect.exceptions import (
    AuthenticationError,
    PermissionDeniedError,
    DatasetNotFoundError,
    RateLimitError,
    UploadError,
    DownloadError,
    HelixError  # Base exception
)

try:
    consumer.download_dataset(dataset_id="...", output_path="...")
except AuthenticationError:
    print("Invalid AWS credentials")
except PermissionDeniedError:
    print("No access to this dataset - subscribe first")
except DatasetNotFoundError:
    print("Dataset doesn't exist")
except RateLimitError as e:
    print(f"Rate limit exceeded - retry after {e.retry_after}s")
except HelixError as e:
    print(f"General error: {e}")
```

## Security & Encryption

The SDK implements a **compress-then-encrypt pipeline** with envelope encryption:

1. **Compression**: Gzip compression (configurable levels 1-9)
2. **Envelope Encryption**: 
   - Generates random 256-bit AES key
   - Encrypts data with AES-256-GCM
   - Encrypts AES key with AWS KMS
   - Packages as: `[key_len][encrypted_key][iv][tag][encrypted_data]`

### Benefits

- ✅ Supports files of **unlimited size** (no KMS 4KB limit)
- ✅ Achieves **~90% space savings** through compression
- ✅ Provides **authenticated encryption** with GCM
- ✅ Uses AWS KMS for **secure key management**

### Compression Performance

| Data Type | Original Size | Compressed | Savings |
|-----------|--------------|------------|---------|
| JSON (user data) | 92 KB | 8 KB | **90.9%** |
| CSV (sales data) | 150 KB | 18 KB | **88.0%** |
| XML (config) | 45 KB | 6 KB | **86.7%** |

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=helix_connect --cov-report=html

# Run specific test suite
pytest tests/test_encryption_compression.py -v
```

## Next Steps

- [Python Installation](/python/installation) - Setup and configuration
- [Getting Started](/) - Overview of all SDKs
