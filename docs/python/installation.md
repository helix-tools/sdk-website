---
sidebar_position: 1
---

# Python Installation

The official Python SDK for the Helix Connect data marketplace platform.

[![PyPI version](https://badge.fury.io/py/helix-connect.svg)](https://badge.fury.io/py/helix-connect)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- AWS credentials (provided during customer onboarding)
- Helix Connect customer ID (UUID format)

## Installation

```bash
pip install helix-connect
```

### Development Installation

For contributing to the SDK:

```bash
git clone https://github.com/helix-tools/helix-connect-sdk-python.git
cd helix-connect-sdk-python
pip install -e ".[dev]"
```

## Configuration

### Environment Variables

```bash
# Required
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export HELIX_CUSTOMER_ID="your-customer-id"

# Optional
export HELIX_API_ENDPOINT="https://api-go.helix.tools"
export HELIX_COMPRESSION_LEVEL="6"  # 1-9, default: 6
```

### Programmatic Configuration

```python
from helix_connect import HelixConsumer

consumer = HelixConsumer(
    aws_access_key_id="your-access-key",
    aws_secret_access_key="your-secret-key",
    customer_id="your-customer-id",
    
    # Optional
    api_endpoint="https://api-go.helix.tools",
    region="us-east-1",
    compression_level=6  # 1=fastest, 9=best compression
)
```

## Verify Installation

```python
from helix_connect import HelixConsumer
import os

def verify():
    consumer = HelixConsumer(
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        customer_id=os.environ["HELIX_CUSTOMER_ID"]
    )
    
    # This will validate credentials on connection
    datasets = consumer.list_datasets()
    print(f"Connected! Found {len(datasets)} datasets.")

if __name__ == "__main__":
    verify()
```

## Dependencies

The SDK requires the following packages (installed automatically):

- `boto3` - AWS SDK for Python
- `cryptography` - Cryptographic operations
- `requests` - HTTP client

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** or AWS Secrets Manager
3. **Rotate credentials** regularly
4. **Use IAM roles** when running on AWS infrastructure
5. **Validate data integrity** after downloads
6. **Monitor CloudWatch logs** for anomalies

## Network Configuration

Default timeout settings:
- **API Timeouts**: 10s connect, 30s read
- **Download Timeouts**: 10s connect, unlimited read (for large files)
- **Credential Validation**: Fail-fast with STS on initialization

## Next Steps

- [Python Usage Guide](/python/usage) - Consumer and Producer APIs
- [Getting Started](/) - Overview of all SDKs
