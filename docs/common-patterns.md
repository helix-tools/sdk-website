---
sidebar_position: 2
---

# Common Patterns & Recipes

This guide covers common integration patterns and best practices for working with the Helix Connect SDKs.

## Authentication Patterns

### Environment-Based Configuration

The recommended approach for credential management:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { HelixConsumer } from '@helix-tools/sdk-typescript';
import dotenv from 'dotenv';

// Load from .env file
dotenv.config();

const consumer = new HelixConsumer({
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  customerId: process.env.HELIX_CUSTOMER_ID!,
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
import os
from helix_connect import HelixConsumer

# Load from environment
consumer = HelixConsumer(
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    customer_id=os.environ["HELIX_CUSTOMER_ID"]
)
```

</TabItem>
<TabItem value="go" label="Go">

```go
import (
    "os"
    helix "github.com/helix-tools/sdk-go"
)

consumer, err := helix.NewConsumer(&helix.Config{
    AWSAccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
    AWSSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
    CustomerID:         os.Getenv("HELIX_CUSTOMER_ID"),
})
```

</TabItem>
</Tabs>

### AWS IAM Role Authentication

When running on AWS infrastructure (EC2, ECS, Lambda), use IAM roles instead of hardcoded credentials:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { HelixConsumer } from '@helix-tools/sdk-typescript';

// SDK will automatically use instance metadata credentials
const consumer = new HelixConsumer({
  customerId: process.env.HELIX_CUSTOMER_ID!,
  // awsAccessKeyId and awsSecretAccessKey are optional with IAM roles
});
```

</TabItem>
<TabItem value="py" label="Python">

```python
from helix_connect import HelixConsumer
import os

# SDK will automatically use instance metadata credentials
consumer = HelixConsumer(
    customer_id=os.environ["HELIX_CUSTOMER_ID"]
    # aws_access_key_id and aws_secret_access_key are optional with IAM roles
)
```

</TabItem>
<TabItem value="go" label="Go">

```go
consumer, err := helix.NewConsumer(&helix.Config{
    CustomerID: os.Getenv("HELIX_CUSTOMER_ID"),
    // AWSAccessKeyID and AWSSecretAccessKey are optional with IAM roles
})
```

</TabItem>
</Tabs>

---

## Download Patterns

### Batch Dataset Downloads

Download multiple datasets efficiently:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { HelixConsumer } from '@helix-tools/sdk-typescript';

async function downloadAll(consumer: HelixConsumer, outputDir: string) {
  const datasets = await consumer.listDatasets();
  
  const downloads = datasets.map(async (dataset) => {
    const outputPath = `${outputDir}/${dataset.name}.csv`;
    try {
      await consumer.downloadDataset({
        datasetId: dataset.id,
        outputPath,
      });
      console.log(`✓ Downloaded: ${dataset.name}`);
      return { id: dataset.id, success: true };
    } catch (error) {
      console.error(`✗ Failed: ${dataset.name} - ${error}`);
      return { id: dataset.id, success: false, error };
    }
  });
  
  return Promise.all(downloads);
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
import os
from concurrent.futures import ThreadPoolExecutor
from helix_connect import HelixConsumer

def download_all(consumer: HelixConsumer, output_dir: str):
    datasets = consumer.list_datasets()
    
    def download_one(dataset):
        output_path = os.path.join(output_dir, f"{dataset['name']}.csv")
        try:
            consumer.download_dataset(
                dataset_id=dataset['id'],
                output_path=output_path
            )
            print(f"✓ Downloaded: {dataset['name']}")
            return {"id": dataset['id'], "success": True}
        except Exception as e:
            print(f"✗ Failed: {dataset['name']} - {e}")
            return {"id": dataset['id'], "success": False, "error": str(e)}
    
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(download_one, datasets))
    
    return results
```

</TabItem>
<TabItem value="go" label="Go">

```go
import (
    "fmt"
    "path/filepath"
    "sync"
    
    helix "github.com/helix-tools/sdk-go"
)

type DownloadResult struct {
    ID      string
    Success bool
    Error   error
}

func downloadAll(consumer *helix.Consumer, outputDir string) []DownloadResult {
    datasets, _ := consumer.ListDatasets()
    results := make([]DownloadResult, len(datasets))
    
    var wg sync.WaitGroup
    for i, ds := range datasets {
        wg.Add(1)
        go func(idx int, dataset helix.Dataset) {
            defer wg.Done()
            outputPath := filepath.Join(outputDir, dataset.Name+".csv")
            err := consumer.DownloadDataset(dataset.ID, outputPath)
            if err != nil {
                fmt.Printf("✗ Failed: %s - %v\n", dataset.Name, err)
                results[idx] = DownloadResult{ID: dataset.ID, Success: false, Error: err}
            } else {
                fmt.Printf("✓ Downloaded: %s\n", dataset.Name)
                results[idx] = DownloadResult{ID: dataset.ID, Success: true}
            }
        }(i, ds)
    }
    
    wg.Wait()
    return results
}
```

</TabItem>
</Tabs>

### Incremental/Delta Downloads

Only download datasets that have been updated:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { HelixConsumer } from '@helix-tools/sdk-typescript';
import fs from 'fs';

interface SyncState {
  [datasetId: string]: { version: string; downloadedAt: string };
}

async function syncDatasets(consumer: HelixConsumer, outputDir: string) {
  const stateFile = `${outputDir}/.sync-state.json`;
  
  // Load previous sync state
  let state: SyncState = {};
  if (fs.existsSync(stateFile)) {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
  }
  
  const datasets = await consumer.listDatasets();
  let updated = 0;
  
  for (const dataset of datasets) {
    const lastSync = state[dataset.id];
    
    // Check if dataset was updated since last sync
    if (!lastSync || lastSync.version !== dataset.version) {
      await consumer.downloadDataset({
        datasetId: dataset.id,
        outputPath: `${outputDir}/${dataset.name}.csv`,
      });
      
      state[dataset.id] = {
        version: dataset.version,
        downloadedAt: new Date().toISOString(),
      };
      updated++;
      console.log(`Updated: ${dataset.name} (v${dataset.version})`);
    }
  }
  
  // Save updated state
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  console.log(`Sync complete: ${updated} datasets updated`);
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
import json
import os
from datetime import datetime
from helix_connect import HelixConsumer

def sync_datasets(consumer: HelixConsumer, output_dir: str):
    state_file = os.path.join(output_dir, ".sync-state.json")
    
    # Load previous sync state
    state = {}
    if os.path.exists(state_file):
        with open(state_file) as f:
            state = json.load(f)
    
    datasets = consumer.list_datasets()
    updated = 0
    
    for dataset in datasets:
        dataset_id = dataset["id"]
        last_sync = state.get(dataset_id)
        
        # Check if dataset was updated since last sync
        if not last_sync or last_sync["version"] != dataset["version"]:
            consumer.download_dataset(
                dataset_id=dataset_id,
                output_path=os.path.join(output_dir, f"{dataset['name']}.csv")
            )
            
            state[dataset_id] = {
                "version": dataset["version"],
                "downloaded_at": datetime.now().isoformat()
            }
            updated += 1
            print(f"Updated: {dataset['name']} (v{dataset['version']})")
    
    # Save updated state
    with open(state_file, "w") as f:
        json.dump(state, f, indent=2)
    
    print(f"Sync complete: {updated} datasets updated")
```

</TabItem>
<TabItem value="go" label="Go">

```go
import (
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "time"
    
    helix "github.com/helix-tools/sdk-go"
)

type SyncState struct {
    Version      string `json:"version"`
    DownloadedAt string `json:"downloaded_at"`
}

func syncDatasets(consumer *helix.Consumer, outputDir string) error {
    stateFile := filepath.Join(outputDir, ".sync-state.json")
    
    // Load previous sync state
    state := make(map[string]SyncState)
    if data, err := os.ReadFile(stateFile); err == nil {
        json.Unmarshal(data, &state)
    }
    
    datasets, err := consumer.ListDatasets()
    if err != nil {
        return err
    }
    
    updated := 0
    for _, ds := range datasets {
        lastSync, exists := state[ds.ID]
        
        if !exists || lastSync.Version != ds.Version {
            outputPath := filepath.Join(outputDir, ds.Name+".csv")
            if err := consumer.DownloadDataset(ds.ID, outputPath); err != nil {
                return err
            }
            
            state[ds.ID] = SyncState{
                Version:      ds.Version,
                DownloadedAt: time.Now().Format(time.RFC3339),
            }
            updated++
            fmt.Printf("Updated: %s (v%s)\n", ds.Name, ds.Version)
        }
    }
    
    // Save updated state
    data, _ := json.MarshalIndent(state, "", "  ")
    os.WriteFile(stateFile, data, 0644)
    
    fmt.Printf("Sync complete: %d datasets updated\n", updated)
    return nil
}
```

</TabItem>
</Tabs>

---

## Notification Patterns

### Continuous Listener with Auto-Download

Set up a daemon that automatically downloads new dataset versions:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { HelixConsumer } from '@helix-tools/sdk-typescript';

async function startListener(consumer: HelixConsumer, outputDir: string) {
  console.log('Starting notification listener...');
  
  const stopListener = consumer.startNotificationListener({
    outputDir,
    pollInterval: 30, // seconds between polls
    
    onNotification: (notification) => {
      console.log(`📬 New update: ${notification.datasetId}`);
    },
    
    onDownload: (datasetId, path) => {
      console.log(`✓ Downloaded ${datasetId} to ${path}`);
      // Trigger your data pipeline here
      processNewData(path);
    },
    
    onError: (error) => {
      console.error('Listener error:', error);
      // Implement your alerting here
    },
  });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down listener...');
    stopListener();
    process.exit(0);
  });
  
  // Keep process alive
  await new Promise(() => {});
}

function processNewData(path: string) {
  // Your data processing logic
  console.log(`Processing: ${path}`);
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
import signal
import sys
from helix_connect import HelixConsumer

def start_listener(consumer: HelixConsumer, output_dir: str):
    print("Starting notification listener...")
    running = True
    
    def signal_handler(sig, frame):
        nonlocal running
        print("\nShutting down listener...")
        running = False
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    
    while running:
        try:
            notifications = consumer.poll_notifications(
                max_messages=10,
                wait_time=20,  # Long polling
                auto_download=True,
                output_dir=output_dir
            )
            
            for n in notifications:
                print(f"✓ Downloaded {n['dataset_id']} to {n['output_path']}")
                process_new_data(n['output_path'])
                
        except Exception as e:
            print(f"Listener error: {e}")
            # Implement retry logic or alerting

def process_new_data(path: str):
    # Your data processing logic
    print(f"Processing: {path}")
```

</TabItem>
<TabItem value="go" label="Go">

```go
import (
    "context"
    "fmt"
    "os"
    "os/signal"
    "syscall"
    
    helix "github.com/helix-tools/sdk-go"
)

func startListener(consumer *helix.Consumer, outputDir string) {
    fmt.Println("Starting notification listener...")
    
    ctx, cancel := context.WithCancel(context.Background())
    
    // Handle graceful shutdown
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
    
    go func() {
        <-sigCh
        fmt.Println("\nShutting down listener...")
        cancel()
    }()
    
    for {
        select {
        case <-ctx.Done():
            return
        default:
            notifications, err := consumer.PollNotifications(&helix.PollOptions{
                MaxMessages:     10,
                WaitTimeSeconds: 20, // Long polling
            })
            
            if err != nil {
                fmt.Printf("Listener error: %v\n", err)
                continue
            }
            
            for _, n := range notifications {
                outputPath := filepath.Join(outputDir, n.DatasetID+".csv")
                if err := consumer.DownloadDataset(n.DatasetID, outputPath); err != nil {
                    fmt.Printf("Download failed: %v\n", err)
                    continue
                }
                fmt.Printf("✓ Downloaded %s to %s\n", n.DatasetID, outputPath)
                processNewData(outputPath)
            }
        }
    }
}

func processNewData(path string) {
    fmt.Printf("Processing: %s\n", path)
}
```

</TabItem>
</Tabs>

---

## Upload Patterns

### Scheduled Dataset Publishing

Publish datasets on a schedule (cron-style):

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { HelixProducer } from '@helix-tools/sdk-typescript';
import cron from 'node-cron';

const producer = new HelixProducer({
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  customerId: process.env.HELIX_CUSTOMER_ID!,
});

// Run every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Starting daily dataset upload...');
  
  try {
    // Generate or fetch your data
    const dataPath = await generateDailyReport();
    
    await producer.updateDataset({
      datasetId: 'your-dataset-id',
      filePath: dataPath,
    });
    
    console.log('Daily upload complete!');
  } catch (error) {
    console.error('Upload failed:', error);
    // Send alert
  }
});

async function generateDailyReport(): Promise<string> {
  // Your data generation logic
  return './data/daily_report.csv';
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
import schedule
import time
from helix_connect import HelixProducer

producer = HelixProducer(
    aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
    aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    customer_id=os.environ["HELIX_CUSTOMER_ID"]
)

def daily_upload():
    print("Starting daily dataset upload...")
    try:
        # Generate or fetch your data
        data_path = generate_daily_report()
        
        producer.update_dataset(
            dataset_id="your-dataset-id",
            file_path=data_path
        )
        print("Daily upload complete!")
    except Exception as e:
        print(f"Upload failed: {e}")
        # Send alert

def generate_daily_report() -> str:
    # Your data generation logic
    return "./data/daily_report.csv"

# Run every day at 2 AM
schedule.every().day.at("02:00").do(daily_upload)

while True:
    schedule.run_pending()
    time.sleep(60)
```

</TabItem>
<TabItem value="go" label="Go">

```go
import (
    "fmt"
    "time"
    
    helix "github.com/helix-tools/sdk-go"
    "github.com/robfig/cron/v3"
)

func main() {
    producer, _ := helix.NewProducer(&helix.Config{
        AWSAccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
        AWSSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
        CustomerID:         os.Getenv("HELIX_CUSTOMER_ID"),
    })
    
    c := cron.New()
    
    // Run every day at 2 AM
    c.AddFunc("0 2 * * *", func() {
        fmt.Println("Starting daily dataset upload...")
        
        dataPath, err := generateDailyReport()
        if err != nil {
            fmt.Printf("Report generation failed: %v\n", err)
            return
        }
        
        err = producer.UpdateDataset("your-dataset-id", dataPath)
        if err != nil {
            fmt.Printf("Upload failed: %v\n", err)
            return
        }
        
        fmt.Println("Daily upload complete!")
    })
    
    c.Start()
    select {} // Block forever
}

func generateDailyReport() (string, error) {
    // Your data generation logic
    return "./data/daily_report.csv", nil
}
```

</TabItem>
</Tabs>

---

## Error Handling Patterns

### Retry with Exponential Backoff

Handle transient failures gracefully:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { HelixConsumer, RateLimitError, HelixError } from '@helix-tools/sdk-typescript';

async function downloadWithRetry(
  consumer: HelixConsumer,
  datasetId: string,
  outputPath: string,
  maxRetries = 3
): Promise<void> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await consumer.downloadDataset({ datasetId, outputPath });
      return; // Success!
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof RateLimitError) {
        // Use server-provided retry delay
        const delay = error.retryAfter * 1000;
        console.log(`Rate limited. Waiting ${error.retryAfter}s...`);
        await sleep(delay);
      } else if (error instanceof HelixError && attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, ...
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`Attempt ${attempt} failed. Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        throw error; // Non-retryable or max retries exceeded
      }
    }
  }
  
  throw lastError;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
```

</TabItem>
<TabItem value="py" label="Python">

```python
import time
from helix_connect import HelixConsumer
from helix_connect.exceptions import RateLimitError, HelixError

def download_with_retry(
    consumer: HelixConsumer,
    dataset_id: str,
    output_path: str,
    max_retries: int = 3
) -> None:
    last_error = None
    
    for attempt in range(1, max_retries + 1):
        try:
            consumer.download_dataset(
                dataset_id=dataset_id,
                output_path=output_path
            )
            return  # Success!
        except RateLimitError as e:
            # Use server-provided retry delay
            print(f"Rate limited. Waiting {e.retry_after}s...")
            time.sleep(e.retry_after)
            last_error = e
        except HelixError as e:
            last_error = e
            if attempt < max_retries:
                # Exponential backoff: 1s, 2s, 4s, ...
                delay = 2 ** (attempt - 1)
                print(f"Attempt {attempt} failed. Retrying in {delay}s...")
                time.sleep(delay)
            else:
                raise
    
    raise last_error
```

</TabItem>
<TabItem value="go" label="Go">

```go
import (
    "errors"
    "fmt"
    "time"
    
    helix "github.com/helix-tools/sdk-go"
)

func downloadWithRetry(
    consumer *helix.Consumer,
    datasetID, outputPath string,
    maxRetries int,
) error {
    var lastErr error
    
    for attempt := 1; attempt <= maxRetries; attempt++ {
        err := consumer.DownloadDataset(datasetID, outputPath)
        if err == nil {
            return nil // Success!
        }
        
        lastErr = err
        
        var rateLimitErr *helix.RateLimitError
        if errors.As(err, &rateLimitErr) {
            fmt.Printf("Rate limited. Waiting %ds...\n", rateLimitErr.RetryAfter)
            time.Sleep(time.Duration(rateLimitErr.RetryAfter) * time.Second)
            continue
        }
        
        var helixErr *helix.HelixError
        if errors.As(err, &helixErr) && attempt < maxRetries {
            delay := time.Duration(1<<(attempt-1)) * time.Second
            fmt.Printf("Attempt %d failed. Retrying in %v...\n", attempt, delay)
            time.Sleep(delay)
            continue
        }
        
        return err
    }
    
    return lastErr
}
```

</TabItem>
</Tabs>

---

## Integration Patterns

### Webhook Notifications

Forward dataset notifications to your webhook:

<Tabs>
<TabItem value="ts" label="TypeScript">

```typescript
import { HelixConsumer } from '@helix-tools/sdk-typescript';
import axios from 'axios';

async function forwardToWebhook(
  consumer: HelixConsumer,
  webhookUrl: string
) {
  const stopListener = consumer.startNotificationListener({
    outputDir: './downloads',
    
    onDownload: async (datasetId, path) => {
      // Forward to webhook
      await axios.post(webhookUrl, {
        event: 'dataset.updated',
        datasetId,
        downloadPath: path,
        timestamp: new Date().toISOString(),
      });
      console.log(`Forwarded ${datasetId} to webhook`);
    },
    
    onError: async (error) => {
      await axios.post(webhookUrl, {
        event: 'error',
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    },
  });
  
  return stopListener;
}
```

</TabItem>
<TabItem value="py" label="Python">

```python
import requests
from datetime import datetime
from helix_connect import HelixConsumer

def forward_to_webhook(consumer: HelixConsumer, webhook_url: str):
    while True:
        try:
            notifications = consumer.poll_notifications(
                max_messages=10,
                wait_time=20,
                auto_download=True,
                output_dir="./downloads"
            )
            
            for n in notifications:
                # Forward to webhook
                requests.post(webhook_url, json={
                    "event": "dataset.updated",
                    "dataset_id": n["dataset_id"],
                    "download_path": n["output_path"],
                    "timestamp": datetime.now().isoformat()
                })
                print(f"Forwarded {n['dataset_id']} to webhook")
                
        except Exception as e:
            requests.post(webhook_url, json={
                "event": "error",
                "message": str(e),
                "timestamp": datetime.now().isoformat()
            })
```

</TabItem>
<TabItem value="go" label="Go">

```go
import (
    "bytes"
    "encoding/json"
    "net/http"
    "time"
    
    helix "github.com/helix-tools/sdk-go"
)

type WebhookPayload struct {
    Event        string `json:"event"`
    DatasetID    string `json:"dataset_id,omitempty"`
    DownloadPath string `json:"download_path,omitempty"`
    Message      string `json:"message,omitempty"`
    Timestamp    string `json:"timestamp"`
}

func forwardToWebhook(consumer *helix.Consumer, webhookURL, outputDir string) {
    for {
        notifications, err := consumer.PollNotifications(&helix.PollOptions{
            MaxMessages:     10,
            WaitTimeSeconds: 20,
        })
        
        if err != nil {
            sendWebhook(webhookURL, WebhookPayload{
                Event:     "error",
                Message:   err.Error(),
                Timestamp: time.Now().Format(time.RFC3339),
            })
            continue
        }
        
        for _, n := range notifications {
            outputPath := filepath.Join(outputDir, n.DatasetID+".csv")
            consumer.DownloadDataset(n.DatasetID, outputPath)
            
            sendWebhook(webhookURL, WebhookPayload{
                Event:        "dataset.updated",
                DatasetID:    n.DatasetID,
                DownloadPath: outputPath,
                Timestamp:    time.Now().Format(time.RFC3339),
            })
        }
    }
}

func sendWebhook(url string, payload WebhookPayload) {
    data, _ := json.Marshal(payload)
    http.Post(url, "application/json", bytes.NewBuffer(data))
}
```

</TabItem>
</Tabs>

---

## Next Steps

- [Troubleshooting Guide](/troubleshooting) — Common issues and solutions
- [TypeScript SDK](/typescript/installation) — Full TypeScript documentation
- [Python SDK](/python/installation) — Full Python documentation
- [Go SDK](/go/installation) — Full Go documentation
