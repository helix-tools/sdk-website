---
sidebar_position: 3
---

# Troubleshooting Guide

This guide covers common issues and their solutions when working with the Helix Connect SDKs.

## Authentication Issues

### Invalid AWS Credentials

**Error:** `AuthenticationError: Invalid AWS credentials`

**Causes:**
1. Incorrect access key or secret key
2. Expired or rotated credentials
3. Credentials copied with extra whitespace

**Solutions:**

```bash
# Verify your credentials are set correctly
echo "Access Key: ${AWS_ACCESS_KEY_ID:0:5}..."
echo "Secret Key: ${AWS_SECRET_ACCESS_KEY:0:5}..."
echo "Customer ID: $HELIX_CUSTOMER_ID"

# Test credentials with AWS CLI
aws sts get-caller-identity
```

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
// Validate credentials on startup
try {
  const consumer = new HelixConsumer({
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    customerId: process.env.HELIX_CUSTOMER_ID!,
  });
  
  // This validates credentials
  await consumer.listDatasets();
  console.log('Credentials valid!');
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
    process.exit(1);
  }
  throw error;
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
try:
    consumer = HelixConsumer(
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
        customer_id=os.environ["HELIX_CUSTOMER_ID"]
    )
    # This validates credentials
    consumer.list_datasets()
    print("Credentials valid!")
except AuthenticationError:
    print("Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
    sys.exit(1)
```

</TabItem>
<TabItem value="go" label="Go">

```go
consumer, err := helix.NewConsumer(&helix.Config{
    AWSAccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
    AWSSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
    CustomerID:         os.Getenv("HELIX_CUSTOMER_ID"),
})
if err != nil {
    var authErr *helix.AuthenticationError
    if errors.As(err, &authErr) {
        fmt.Println("Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
        os.Exit(1)
    }
    panic(err)
}
```

</TabItem>
</Tabs>

---

### Invalid Customer ID

**Error:** `AuthenticationError: Invalid customer ID format`

**Cause:** Customer ID must be a valid UUID format.

**Solution:**
```bash
# Valid format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
export HELIX_CUSTOMER_ID="a1b2c3d4-e5f6-7890-abcd-ef1234567890"

# Invalid formats:
# - "a1b2c3d4e5f67890abcdef1234567890" (missing hyphens)
# - "my-company-id" (not a UUID)
```

---

### Credential Not Found in Environment

**Error:** `Error: AWS_ACCESS_KEY_ID is not defined`

**Solution:** Ensure environment variables are exported properly:

```bash
# Add to ~/.bashrc, ~/.zshrc, or ~/.profile
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export HELIX_CUSTOMER_ID="your-customer-id"

# Reload shell configuration
source ~/.bashrc  # or ~/.zshrc
```

For dotenv files:

```bash
# .env file
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
HELIX_CUSTOMER_ID=your-customer-id
```

---

## Permission Issues

### Access Denied to Dataset

**Error:** `PermissionDeniedError: Access denied to dataset`

**Causes:**
1. Not subscribed to the dataset
2. Subscription expired
3. Producer revoked access

**Solutions:**

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { PermissionDeniedError } from '@helix-tools/sdk-typescript';

try {
  await consumer.downloadDataset({
    datasetId: 'some-dataset-id',
    outputPath: './output.csv',
  });
} catch (error) {
  if (error instanceof PermissionDeniedError) {
    // Check if we're subscribed
    const subscriptions = await consumer.listSubscriptions();
    const isSubscribed = subscriptions.some(s => s.datasetId === 'some-dataset-id');
    
    if (!isSubscribed) {
      console.log('Not subscribed. Attempting to subscribe...');
      await consumer.subscribeToDataset({ datasetId: 'some-dataset-id' });
      // Retry download
    } else {
      console.log('Subscription may have expired. Contact support.');
    }
  }
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
from helix_connect.exceptions import PermissionDeniedError

try:
    consumer.download_dataset(
        dataset_id="some-dataset-id",
        output_path="./output.csv"
    )
except PermissionDeniedError:
    # Check if we're subscribed
    subscriptions = consumer.list_subscriptions()
    is_subscribed = any(s["dataset_id"] == "some-dataset-id" for s in subscriptions)
    
    if not is_subscribed:
        print("Not subscribed. Attempting to subscribe...")
        consumer.subscribe_to_dataset(dataset_id="some-dataset-id")
        # Retry download
    else:
        print("Subscription may have expired. Contact support.")
```

</TabItem>
<TabItem value="go" label="Go">

```go
err := consumer.DownloadDataset("some-dataset-id", "./output.csv")
if err != nil {
    var permErr *helix.PermissionDeniedError
    if errors.As(err, &permErr) {
        subscriptions, _ := consumer.ListSubscriptions()
        isSubscribed := false
        for _, s := range subscriptions {
            if s.DatasetID == "some-dataset-id" {
                isSubscribed = true
                break
            }
        }
        
        if !isSubscribed {
            fmt.Println("Not subscribed. Attempting to subscribe...")
            consumer.SubscribeToDataset("some-dataset-id")
            // Retry download
        } else {
            fmt.Println("Subscription may have expired. Contact support.")
        }
    }
}
```

</TabItem>
</Tabs>

---

## Network Issues

### Connection Timeout

**Error:** `TimeoutError: Connection timed out`

**Causes:**
1. Network connectivity issues
2. Firewall blocking outbound connections
3. DNS resolution failure
4. API endpoint unreachable

**Solutions:**

```bash
# Test connectivity to Helix API
curl -I https://api-go.helix.tools/health

# Check DNS resolution
nslookup api-go.helix.tools

# Test from behind proxy
export HTTPS_PROXY=http://your-proxy:8080
curl -I https://api-go.helix.tools/health
```

Configure custom timeouts:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
const consumer = new HelixConsumer({
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  customerId: process.env.HELIX_CUSTOMER_ID!,
  
  // Increase timeouts
  connectTimeout: 30000, // 30 seconds
  readTimeout: 60000,    // 60 seconds
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
consumer = HelixConsumer(
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    customer_id=os.environ["HELIX_CUSTOMER_ID"],
    
    # Increase timeouts
    connect_timeout=30,  # 30 seconds
    read_timeout=60      # 60 seconds
)
```

</TabItem>
<TabItem value="go" label="Go">

```go
consumer, err := helix.NewConsumer(&helix.Config{
    AWSAccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
    AWSSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
    CustomerID:         os.Getenv("HELIX_CUSTOMER_ID"),
    
    // Increase timeouts
    ConnectTimeout: 30 * time.Second,
    ReadTimeout:    60 * time.Second,
})
```

</TabItem>
</Tabs>

---

### SSL/TLS Certificate Errors

**Error:** `SSLError: Certificate verification failed`

**Causes:**
1. Corporate proxy intercepting HTTPS
2. Outdated CA certificates
3. System clock out of sync

**Solutions:**

```bash
# Update CA certificates (Ubuntu/Debian)
sudo apt update && sudo apt install ca-certificates

# Update CA certificates (macOS)
brew install ca-certificates

# Check system time
date
# If wrong, sync:
sudo ntpdate pool.ntp.org
```

:::warning
Never disable SSL verification in production! This is only for debugging.
:::

---

## Rate Limiting

### Rate Limit Exceeded

**Error:** `RateLimitError: Too many requests`

**Solution:** Implement exponential backoff:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { RateLimitError } from '@helix-tools/sdk-typescript';

async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 5
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof RateLimitError) {
        const waitTime = error.retryAfter || Math.pow(2, attempt);
        console.log(`Rate limited. Waiting ${waitTime}s...`);
        await new Promise(r => setTimeout(r, waitTime * 1000));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const datasets = await withRateLimitRetry(() => consumer.listDatasets());
```

</TabItem>
<TabItem value="py" label="Python">

```python
import time
from helix_connect.exceptions import RateLimitError

def with_rate_limit_retry(fn, max_retries=5):
    for attempt in range(max_retries):
        try:
            return fn()
        except RateLimitError as e:
            wait_time = e.retry_after or (2 ** attempt)
            print(f"Rate limited. Waiting {wait_time}s...")
            time.sleep(wait_time)
    raise Exception("Max retries exceeded")

# Usage
datasets = with_rate_limit_retry(lambda: consumer.list_datasets())
```

</TabItem>
<TabItem value="go" label="Go">

```go
func withRateLimitRetry[T any](fn func() (T, error), maxRetries int) (T, error) {
    var zero T
    for attempt := 0; attempt < maxRetries; attempt++ {
        result, err := fn()
        if err == nil {
            return result, nil
        }
        
        var rateLimitErr *helix.RateLimitError
        if errors.As(err, &rateLimitErr) {
            waitTime := rateLimitErr.RetryAfter
            if waitTime == 0 {
                waitTime = int(math.Pow(2, float64(attempt)))
            }
            fmt.Printf("Rate limited. Waiting %ds...\n", waitTime)
            time.Sleep(time.Duration(waitTime) * time.Second)
        } else {
            return zero, err
        }
    }
    return zero, fmt.Errorf("max retries exceeded")
}

// Usage
datasets, err := withRateLimitRetry(func() ([]helix.Dataset, error) {
    return consumer.ListDatasets()
}, 5)
```

</TabItem>
</Tabs>

---

## Download Issues

### Dataset Not Found

**Error:** `DatasetNotFoundError: Dataset not found`

**Causes:**
1. Dataset ID is incorrect
2. Dataset was deleted by producer
3. Typo in dataset ID

**Solution:**

```typescript
// List available datasets to verify IDs
const datasets = await consumer.listDatasets();
console.log('Available datasets:');
for (const ds of datasets) {
  console.log(`  ${ds.id}: ${ds.name}`);
}
```

---

### Download Interrupted

**Error:** `DownloadError: Connection reset during download`

**Causes:**
1. Network instability
2. Large file with slow connection
3. Server-side timeout

**Solution:** Implement resume capability:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
async function downloadWithResume(
  consumer: HelixConsumer,
  datasetId: string,
  outputPath: string,
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await consumer.downloadDataset({
        datasetId,
        outputPath,
        resume: true, // Resume from last position if available
      });
      return;
    } catch (error) {
      console.log(`Download attempt ${attempt} failed: ${error}`);
      if (attempt === maxRetries) throw error;
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
def download_with_resume(consumer, dataset_id, output_path, max_retries=3):
    for attempt in range(1, max_retries + 1):
        try:
            consumer.download_dataset(
                dataset_id=dataset_id,
                output_path=output_path,
                resume=True  # Resume from last position if available
            )
            return
        except Exception as e:
            print(f"Download attempt {attempt} failed: {e}")
            if attempt == max_retries:
                raise
            time.sleep(5)
```

</TabItem>
<TabItem value="go" label="Go">

```go
func downloadWithResume(
    consumer *helix.Consumer,
    datasetID, outputPath string,
    maxRetries int,
) error {
    for attempt := 1; attempt <= maxRetries; attempt++ {
        err := consumer.DownloadDataset(datasetID, outputPath)
        if err == nil {
            return nil
        }
        fmt.Printf("Download attempt %d failed: %v\n", attempt, err)
        if attempt == maxRetries {
            return err
        }
        time.Sleep(5 * time.Second)
    }
    return nil
}
```

</TabItem>
</Tabs>

---

## Upload Issues

### File Too Large

**Error:** `UploadError: File exceeds maximum size`

**Solution:** The SDK handles large files automatically with chunked uploads. If you're still seeing this error:

1. Check your account's storage quota
2. Contact support for quota increase
3. Consider splitting very large datasets

---

### Upload Validation Failed

**Error:** `ValidationError: Invalid dataset format`

**Causes:**
1. File is empty
2. Invalid file encoding
3. Corrupted file

**Solution:**

```bash
# Check file is not empty
ls -la your_dataset.csv

# Check file encoding (should be UTF-8)
file -i your_dataset.csv

# Convert encoding if needed
iconv -f ISO-8859-1 -t UTF-8 input.csv > output.csv
```

---

## Notification Issues

### No Notifications Received

**Causes:**
1. Not subscribed to any datasets
2. No dataset updates since subscription
3. SQS queue not configured

**Solution:**

```typescript
// Verify subscriptions
const subscriptions = await consumer.listSubscriptions();
console.log('Active subscriptions:', subscriptions.length);

if (subscriptions.length === 0) {
  console.log('No subscriptions! Subscribe to datasets first.');
}

// Test with a short poll
const notifications = await consumer.pollNotifications({
  maxMessages: 1,
  waitTimeSeconds: 5, // Short timeout for testing
});
console.log('Pending notifications:', notifications.length);
```

---

## Common Error Codes

| Error Code | Description | Solution |
|------------|-------------|----------|
| `E001` | Invalid credentials | Verify AWS keys |
| `E002` | Permission denied | Check subscription status |
| `E003` | Dataset not found | Verify dataset ID |
| `E004` | Rate limit exceeded | Implement backoff |
| `E005` | Network timeout | Check connectivity |
| `E006` | Validation error | Check data format |
| `E007` | Quota exceeded | Contact support |
| `E008` | Service unavailable | Retry later |

---

## Getting Help

If you're still experiencing issues:

1. **Check the status page**: [status.helix.tools](https://status.helix.tools)
2. **Search GitHub issues**: [github.com/helix-tools/sdk-docs/issues](https://github.com/helix-tools/sdk-docs/issues)
3. **Contact support**: [support@helix.tools](mailto:support@helix.tools)

When contacting support, please include:
- SDK version
- Programming language and version
- Full error message and stack trace
- Steps to reproduce
- Request ID (if available in error)
