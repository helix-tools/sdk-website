---
sidebar_position: 3
---

# Python Advanced Topics

This guide covers advanced usage patterns, performance optimization, and production deployment best practices for the Python SDK.

## Performance Optimization

### Connection Pooling

The SDK uses connection pooling by default. Configure pool settings for high-throughput scenarios:

```python
from helix_connect import HelixConsumer

consumer = HelixConsumer(
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    customer_id=os.environ["HELIX_CUSTOMER_ID"],
    
    # Connection pool settings
    pool_connections=10,  # Number of connection pools
    pool_maxsize=20,      # Max connections per pool
    max_retries=3,        # Retry count for failed connections
)
```

### Async Support

For asyncio-based applications:

```python
import asyncio
from helix_connect import AsyncHelixConsumer

async def main():
    consumer = AsyncHelixConsumer(
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        customer_id=os.environ["HELIX_CUSTOMER_ID"]
    )
    
    # Async operations
    datasets = await consumer.list_datasets()
    
    # Parallel downloads
    tasks = [
        consumer.download_dataset(
            dataset_id=ds["id"],
            output_path=f"./data/{ds['name']}.csv"
        )
        for ds in datasets[:5]
    ]
    await asyncio.gather(*tasks)
    
    await consumer.close()

asyncio.run(main())
```

### Streaming Downloads

For very large files, use streaming to avoid memory issues:

```python
def download_large_file(consumer, dataset_id, output_path):
    """Stream download directly to disk without loading into memory."""
    with consumer.stream_download(dataset_id) as stream:
        with open(output_path, 'wb') as f:
            for chunk in stream.iter_content(chunk_size=8192):
                f.write(chunk)
```

### Progress Callbacks

Efficient progress tracking without performance impact:

```python
from tqdm import tqdm

def download_with_tqdm(consumer, dataset_id, output_path):
    """Download with tqdm progress bar."""
    
    # Get file size first
    metadata = consumer.get_dataset_metadata(dataset_id)
    file_size = metadata['size_bytes']
    
    with tqdm(total=file_size, unit='B', unit_scale=True) as pbar:
        def update_progress(transferred, total):
            pbar.update(transferred - pbar.n)
        
        consumer.download_dataset(
            dataset_id=dataset_id,
            output_path=output_path,
            progress_callback=update_progress
        )
```

## Encryption Deep Dive

### Understanding the Pipeline

The SDK implements a compress-then-encrypt pipeline:

```python
# Pipeline stages:
# 1. GZIP compression (configurable level)
# 2. AES-256-GCM encryption with random DEK
# 3. DEK encrypted with KMS CMK
# 4. Envelope packaging

# Data format on wire:
# [key_len: 4 bytes][encrypted_dek: variable][iv: 12 bytes][tag: 16 bytes][ciphertext]
```

### Custom Compression Levels

```python
from helix_connect import HelixProducer

# Level 1: Fastest compression, larger files
fast_producer = HelixProducer(
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    customer_id=os.environ["HELIX_CUSTOMER_ID"],
    compression_level=1
)

# Level 9: Best compression, slower
best_producer = HelixProducer(
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    customer_id=os.environ["HELIX_CUSTOMER_ID"],
    compression_level=9
)
```

### Compression Benchmarks

| Compression Level | Speed | Ratio | Best For |
|------------------|-------|-------|----------|
| 1 | Fastest | ~60% | Real-time uploads |
| 6 (default) | Balanced | ~85% | Most use cases |
| 9 | Slowest | ~90% | Archival, infrequent uploads |

### Verifying Data Integrity

```python
import hashlib

def verify_download(consumer, dataset_id, output_path):
    """Download and verify integrity."""
    metadata = consumer.get_dataset_metadata(dataset_id)
    expected_hash = metadata.get('checksum_sha256')
    
    consumer.download_dataset(
        dataset_id=dataset_id,
        output_path=output_path
    )
    
    # Calculate hash of downloaded file
    sha256 = hashlib.sha256()
    with open(output_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            sha256.update(chunk)
    
    actual_hash = sha256.hexdigest()
    
    if actual_hash != expected_hash:
        raise ValueError(f"Checksum mismatch! Expected {expected_hash}, got {actual_hash}")
    
    print("Integrity verified!")
```

## Production Deployment

### Configuration Management

Use structured configuration:

```python
from dataclasses import dataclass
from typing import Optional
import os

@dataclass
class HelixConfig:
    aws_access_key_id: str
    aws_secret_access_key: str
    customer_id: str
    api_endpoint: str = "https://api-go.helix.tools"
    region: str = "us-east-1"
    compression_level: int = 6
    connect_timeout: int = 10
    read_timeout: int = 30
    
    @classmethod
    def from_env(cls) -> "HelixConfig":
        """Load config from environment variables."""
        return cls(
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
            customer_id=os.environ["HELIX_CUSTOMER_ID"],
            api_endpoint=os.getenv("HELIX_API_ENDPOINT", "https://api-go.helix.tools"),
            region=os.getenv("HELIX_REGION", "us-east-1"),
            compression_level=int(os.getenv("HELIX_COMPRESSION_LEVEL", "6")),
        )
    
    @classmethod
    def from_ssm(cls, prefix: str = "/helix/") -> "HelixConfig":
        """Load config from AWS SSM Parameter Store."""
        import boto3
        ssm = boto3.client('ssm')
        
        params = ssm.get_parameters_by_path(
            Path=prefix,
            WithDecryption=True
        )['Parameters']
        
        config = {p['Name'].replace(prefix, ''): p['Value'] for p in params}
        return cls(**config)

# Usage
config = HelixConfig.from_env()
consumer = HelixConsumer(
    aws_access_key_id=config.aws_access_key_id,
    aws_secret_access_key=config.aws_secret_access_key,
    customer_id=config.customer_id,
    api_endpoint=config.api_endpoint,
)
```

### Logging Integration

```python
import logging
from helix_connect import HelixConsumer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Enable SDK debug logging
logging.getLogger('helix_connect').setLevel(logging.DEBUG)

# Or use structured logging with structlog
import structlog

structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)
```

### Health Checks

Implement health checks for monitoring:

```python
from flask import Flask, jsonify
from helix_connect import HelixConsumer
from helix_connect.exceptions import AuthenticationError

app = Flask(__name__)
consumer = None

def get_consumer():
    global consumer
    if consumer is None:
        consumer = HelixConsumer(
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
            customer_id=os.environ["HELIX_CUSTOMER_ID"]
        )
    return consumer

@app.route('/health')
def health_check():
    return jsonify({"status": "healthy"})

@app.route('/health/detailed')
def detailed_health():
    try:
        c = get_consumer()
        datasets = c.list_datasets()
        return jsonify({
            "status": "healthy",
            "helix_connection": "ok",
            "dataset_count": len(datasets)
        })
    except AuthenticationError:
        return jsonify({
            "status": "unhealthy",
            "helix_connection": "auth_failed"
        }), 503
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 503
```

### Metrics Collection

```python
from prometheus_client import Counter, Histogram, start_http_server
import time

# Define metrics
DOWNLOADS = Counter(
    'helix_downloads_total',
    'Total dataset downloads',
    ['dataset_id', 'status']
)

DOWNLOAD_DURATION = Histogram(
    'helix_download_duration_seconds',
    'Time spent downloading datasets',
    ['dataset_id']
)

DOWNLOAD_SIZE = Histogram(
    'helix_download_size_bytes',
    'Size of downloaded datasets',
    buckets=[1e6, 10e6, 100e6, 1e9, 10e9]
)

def download_with_metrics(consumer, dataset_id, output_path):
    start_time = time.time()
    try:
        consumer.download_dataset(
            dataset_id=dataset_id,
            output_path=output_path
        )
        DOWNLOADS.labels(dataset_id=dataset_id, status='success').inc()
        
        # Record file size
        file_size = os.path.getsize(output_path)
        DOWNLOAD_SIZE.observe(file_size)
        
    except Exception as e:
        DOWNLOADS.labels(dataset_id=dataset_id, status='error').inc()
        raise
    finally:
        duration = time.time() - start_time
        DOWNLOAD_DURATION.labels(dataset_id=dataset_id).observe(duration)

# Start metrics server
start_http_server(8000)
```

## Testing Strategies

### Unit Testing with Mocks

```python
import pytest
from unittest.mock import Mock, patch
from helix_connect import HelixConsumer

@pytest.fixture
def mock_consumer():
    with patch.object(HelixConsumer, '_validate_credentials'):
        consumer = HelixConsumer(
            aws_access_key_id="test-key",
            aws_secret_access_key="test-secret",
            customer_id="test-customer-id"
        )
        return consumer

def test_list_datasets(mock_consumer):
    mock_consumer._api_client = Mock()
    mock_consumer._api_client.get.return_value = {
        "datasets": [
            {"id": "ds-1", "name": "Test Dataset"},
        ]
    }
    
    datasets = mock_consumer.list_datasets()
    
    assert len(datasets) == 1
    assert datasets[0]["name"] == "Test Dataset"

def test_download_creates_file(mock_consumer, tmp_path):
    output_file = tmp_path / "output.csv"
    
    mock_consumer._s3_client = Mock()
    mock_consumer._s3_client.download_file = Mock()
    
    mock_consumer.download_dataset(
        dataset_id="ds-1",
        output_path=str(output_file)
    )
    
    mock_consumer._s3_client.download_file.assert_called_once()
```

### Integration Testing

```python
import pytest
import os

@pytest.fixture
def real_consumer():
    """Requires real credentials in environment."""
    if not os.getenv("HELIX_TEST_ENABLED"):
        pytest.skip("Integration tests disabled")
    
    return HelixConsumer(
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        customer_id=os.environ["HELIX_CUSTOMER_ID"]
    )

def test_real_list_datasets(real_consumer):
    datasets = real_consumer.list_datasets()
    assert isinstance(datasets, list)

def test_real_download(real_consumer, tmp_path):
    datasets = real_consumer.list_datasets()
    if not datasets:
        pytest.skip("No datasets available")
    
    output_file = tmp_path / "test.csv"
    real_consumer.download_dataset(
        dataset_id=datasets[0]["id"],
        output_path=str(output_file)
    )
    
    assert output_file.exists()
    assert output_file.stat().st_size > 0
```

## Thread Safety

The SDK is thread-safe. Each thread should use its own client instance:

```python
from concurrent.futures import ThreadPoolExecutor
from threading import local

# Thread-local storage for clients
_thread_local = local()

def get_consumer():
    if not hasattr(_thread_local, 'consumer'):
        _thread_local.consumer = HelixConsumer(
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
            customer_id=os.environ["HELIX_CUSTOMER_ID"]
        )
    return _thread_local.consumer

def download_dataset(dataset_id: str, output_path: str):
    consumer = get_consumer()
    consumer.download_dataset(
        dataset_id=dataset_id,
        output_path=output_path
    )

# Safe parallel downloads
with ThreadPoolExecutor(max_workers=4) as executor:
    futures = [
        executor.submit(download_dataset, ds["id"], f"./data/{ds['name']}.csv")
        for ds in datasets
    ]
    for future in futures:
        future.result()  # Raises any exceptions
```

## Next Steps

- [Python Installation](/python/installation) — Setup and configuration
- [Python Usage Guide](/python/usage) — Core API usage
- [Common Patterns](/common-patterns) — Integration recipes
- [Troubleshooting](/troubleshooting) — Common issues and solutions
