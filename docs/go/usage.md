---
sidebar_position: 2
---

# Go Usage Guide

Complete guide to using the Helix Connect Go SDK for consuming and producing datasets.

## Consumer API

### Initialize Consumer

```go
package main

import (
    "os"
    
    helix "github.com/helix-tools/sdk-go"
)

func main() {
    consumer, err := helix.NewConsumer(&helix.Config{
        AWSAccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
        AWSSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
        CustomerID:         os.Getenv("HELIX_CUSTOMER_ID"),
    })
    if err != nil {
        panic(err)
    }
    
    // Use consumer...
}
```

### List Available Datasets

```go
datasets, err := consumer.ListDatasets()
if err != nil {
    return fmt.Errorf("failed to list datasets: %w", err)
}

for _, ds := range datasets {
    fmt.Printf("%s: %s\n", ds.ID, ds.Name)
    fmt.Printf("  Description: %s\n", ds.Description)
    fmt.Printf("  Freshness: %s\n", ds.DataFreshness)
}
```

### Download a Dataset

```go
// Simple download
err := consumer.DownloadDataset("dataset-id", "./data/output.csv")
if err != nil {
    return fmt.Errorf("download failed: %w", err)
}

// Download with progress callback
err = consumer.DownloadDatasetWithProgress("dataset-id", "./data/output.csv", 
    func(transferred, total int64) {
        percent := float64(transferred) / float64(total) * 100
        fmt.Printf("\rDownloading: %.1f%%", percent)
    },
)
```

### Subscribe to Updates

```go
// Subscribe to a dataset
err := consumer.SubscribeToDataset("dataset-id")
if err != nil {
    return fmt.Errorf("subscription failed: %w", err)
}

// Poll for notifications
notifications, err := consumer.PollNotifications(&helix.PollOptions{
    MaxMessages:     10,
    WaitTimeSeconds: 20,
})
if err != nil {
    return fmt.Errorf("polling failed: %w", err)
}

for _, n := range notifications {
    fmt.Printf("Dataset %s updated to version %s\n", n.DatasetID, n.Version)
}
```

## Producer API

### Initialize Producer

```go
producer, err := helix.NewProducer(&helix.Config{
    AWSAccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
    AWSSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
    CustomerID:         os.Getenv("HELIX_CUSTOMER_ID"),
})
if err != nil {
    panic(err)
}
```

### Upload a Dataset

```go
result, err := producer.UploadDataset(&helix.UploadOptions{
    FilePath:      "./data/my_dataset.csv",
    DatasetName:   "my-awesome-dataset",
    Description:   "Q4 2024 sales data",
    DataFreshness: helix.FreshnessDaily,
})
if err != nil {
    return fmt.Errorf("upload failed: %w", err)
}

fmt.Printf("Uploaded dataset: %s\n", result.DatasetID)
```

### Upload with Progress

```go
result, err := producer.UploadDatasetWithProgress(
    &helix.UploadOptions{
        FilePath:      "./data/my_dataset.csv",
        DatasetName:   "my-awesome-dataset",
        Description:   "Q4 2024 sales data",
        DataFreshness: helix.FreshnessDaily,
    },
    func(transferred, total int64) {
        percent := float64(transferred) / float64(total) * 100
        fmt.Printf("\rUploading: %.1f%%", percent)
    },
)
```

### Update Existing Dataset

```go
err := producer.UpdateDataset("dataset-id", "./data/updated_dataset.csv")
if err != nil {
    return fmt.Errorf("update failed: %w", err)
}
```

### List Your Datasets

```go
myDatasets, err := producer.ListMyDatasets()
if err != nil {
    return fmt.Errorf("failed to list: %w", err)
}

for _, ds := range myDatasets {
    fmt.Printf("%s: %d downloads\n", ds.Name, ds.DownloadCount)
}
```

## Error Handling

```go
import (
    helix "github.com/helix-tools/sdk-go"
    "errors"
)

err := consumer.DownloadDataset("dataset-id", "./output.csv")
if err != nil {
    var authErr *helix.AuthenticationError
    var permErr *helix.PermissionDeniedError
    var notFoundErr *helix.DatasetNotFoundError
    var rateLimitErr *helix.RateLimitError
    
    switch {
    case errors.As(err, &authErr):
        fmt.Println("Invalid AWS credentials")
    case errors.As(err, &permErr):
        fmt.Println("No access to this dataset - subscribe first")
    case errors.As(err, &notFoundErr):
        fmt.Println("Dataset doesn't exist")
    case errors.As(err, &rateLimitErr):
        fmt.Printf("Rate limit exceeded - retry after %d seconds\n", rateLimitErr.RetryAfter)
    default:
        fmt.Printf("Unexpected error: %v\n", err)
    }
}
```

## Data Freshness Constants

```go
const (
    FreshnessRealtime  = helix.FreshnessRealtime
    FreshnessHourly    = helix.FreshnessHourly
    FreshnessDaily     = helix.FreshnessDaily
    FreshnessWeekly    = helix.FreshnessWeekly
    FreshnessMonthly   = helix.FreshnessMonthly
    FreshnessQuarterly = helix.FreshnessQuarterly
    FreshnessStatic    = helix.FreshnessStatic
)
```

## Context Support

All API methods support Go contexts for cancellation and timeouts:

```go
ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

datasets, err := consumer.ListDatasetsWithContext(ctx)
if err != nil {
    if errors.Is(err, context.DeadlineExceeded) {
        fmt.Println("Request timed out")
    }
    return err
}
```

## Security & Encryption

The SDK automatically handles:

1. **AWS SigV4 signing** for authenticated API requests
2. **AES-256-GCM encryption** for data at rest
3. **Gzip compression** for efficient transfers
4. **KMS-backed key management**

## Next Steps

- [Go Installation](/go/installation) - Setup and configuration
- [Getting Started](/) - Overview of all SDKs
