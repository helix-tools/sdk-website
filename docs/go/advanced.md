---
sidebar_position: 3
---

# Go Advanced Topics

This guide covers advanced usage patterns, performance optimization, and production deployment best practices for the Go SDK.

## Performance Optimization

### Connection Management

Configure HTTP client settings for optimal performance:

```go
import (
    "net"
    "net/http"
    "time"
    
    helix "github.com/helix-tools/sdk-go"
)

func createOptimizedConsumer() (*helix.Consumer, error) {
    // Custom HTTP transport for high-throughput scenarios
    transport := &http.Transport{
        DialContext: (&net.Dialer{
            Timeout:   30 * time.Second,
            KeepAlive: 30 * time.Second,
        }).DialContext,
        MaxIdleConns:          100,
        MaxIdleConnsPerHost:   20,
        IdleConnTimeout:       90 * time.Second,
        TLSHandshakeTimeout:   10 * time.Second,
        ExpectContinueTimeout: 1 * time.Second,
    }
    
    httpClient := &http.Client{
        Transport: transport,
        Timeout:   60 * time.Second,
    }
    
    return helix.NewConsumer(&helix.Config{
        AWSAccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
        AWSSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
        CustomerID:         os.Getenv("HELIX_CUSTOMER_ID"),
        HTTPClient:         httpClient,
    })
}
```

### Concurrent Downloads with Worker Pool

```go
import (
    "context"
    "fmt"
    "path/filepath"
    "sync"
    
    helix "github.com/helix-tools/sdk-go"
)

type DownloadJob struct {
    DatasetID  string
    OutputPath string
}

type DownloadResult struct {
    DatasetID string
    Error     error
}

func downloadWithWorkerPool(
    ctx context.Context,
    consumer *helix.Consumer,
    jobs []DownloadJob,
    workers int,
) []DownloadResult {
    jobCh := make(chan DownloadJob, len(jobs))
    resultCh := make(chan DownloadResult, len(jobs))
    
    // Start workers
    var wg sync.WaitGroup
    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func(workerID int) {
            defer wg.Done()
            for job := range jobCh {
                select {
                case <-ctx.Done():
                    resultCh <- DownloadResult{
                        DatasetID: job.DatasetID,
                        Error:     ctx.Err(),
                    }
                default:
                    err := consumer.DownloadDatasetWithContext(ctx, job.DatasetID, job.OutputPath)
                    resultCh <- DownloadResult{
                        DatasetID: job.DatasetID,
                        Error:     err,
                    }
                }
            }
        }(i)
    }
    
    // Send jobs
    for _, job := range jobs {
        jobCh <- job
    }
    close(jobCh)
    
    // Wait and collect results
    go func() {
        wg.Wait()
        close(resultCh)
    }()
    
    results := make([]DownloadResult, 0, len(jobs))
    for result := range resultCh {
        results = append(results, result)
    }
    
    return results
}

// Usage
func main() {
    consumer, _ := helix.NewConsumer(&helix.Config{...})
    
    datasets, _ := consumer.ListDatasets()
    
    jobs := make([]DownloadJob, len(datasets))
    for i, ds := range datasets {
        jobs[i] = DownloadJob{
            DatasetID:  ds.ID,
            OutputPath: filepath.Join("./data", ds.Name+".csv"),
        }
    }
    
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
    defer cancel()
    
    results := downloadWithWorkerPool(ctx, consumer, jobs, 4)
    
    for _, r := range results {
        if r.Error != nil {
            fmt.Printf("Failed: %s - %v\n", r.DatasetID, r.Error)
        } else {
            fmt.Printf("Success: %s\n", r.DatasetID)
        }
    }
}
```

### Streaming Large Files

For memory-efficient handling of large files:

```go
import (
    "io"
    "os"
    
    helix "github.com/helix-tools/sdk-go"
)

func streamDownload(consumer *helix.Consumer, datasetID, outputPath string) error {
    // Get a streaming reader
    reader, err := consumer.StreamDataset(datasetID)
    if err != nil {
        return fmt.Errorf("stream failed: %w", err)
    }
    defer reader.Close()
    
    // Create output file
    file, err := os.Create(outputPath)
    if err != nil {
        return fmt.Errorf("create file failed: %w", err)
    }
    defer file.Close()
    
    // Stream copy with buffer
    buf := make([]byte, 32*1024) // 32KB buffer
    written, err := io.CopyBuffer(file, reader, buf)
    if err != nil {
        return fmt.Errorf("copy failed: %w", err)
    }
    
    fmt.Printf("Downloaded %d bytes\n", written)
    return nil
}
```

## Context and Cancellation

### Timeout Handling

```go
import (
    "context"
    "errors"
    "time"
    
    helix "github.com/helix-tools/sdk-go"
)

func downloadWithTimeout(
    consumer *helix.Consumer,
    datasetID, outputPath string,
    timeout time.Duration,
) error {
    ctx, cancel := context.WithTimeout(context.Background(), timeout)
    defer cancel()
    
    err := consumer.DownloadDatasetWithContext(ctx, datasetID, outputPath)
    if err != nil {
        if errors.Is(err, context.DeadlineExceeded) {
            return fmt.Errorf("download timed out after %v", timeout)
        }
        if errors.Is(err, context.Canceled) {
            return fmt.Errorf("download was canceled")
        }
        return err
    }
    
    return nil
}
```

### Graceful Shutdown

```go
import (
    "context"
    "os"
    "os/signal"
    "syscall"
    
    helix "github.com/helix-tools/sdk-go"
)

func runWithGracefulShutdown(consumer *helix.Consumer) {
    ctx, cancel := context.WithCancel(context.Background())
    
    // Handle shutdown signals
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
    
    go func() {
        sig := <-sigCh
        fmt.Printf("Received signal %v, shutting down...\n", sig)
        cancel()
    }()
    
    // Start notification listener
    go func() {
        for {
            select {
            case <-ctx.Done():
                return
            default:
                notifications, err := consumer.PollNotificationsWithContext(ctx, &helix.PollOptions{
                    MaxMessages:     10,
                    WaitTimeSeconds: 20,
                })
                if err != nil {
                    if !errors.Is(err, context.Canceled) {
                        fmt.Printf("Poll error: %v\n", err)
                    }
                    continue
                }
                
                for _, n := range notifications {
                    fmt.Printf("Notification: %s\n", n.DatasetID)
                }
            }
        }
    }()
    
    // Wait for shutdown
    <-ctx.Done()
    fmt.Println("Shutdown complete")
}
```

## Error Handling Patterns

### Structured Error Types

```go
import (
    "errors"
    "fmt"
    
    helix "github.com/helix-tools/sdk-go"
)

func handleError(err error) {
    if err == nil {
        return
    }
    
    // Type assertions for specific error types
    var authErr *helix.AuthenticationError
    var permErr *helix.PermissionDeniedError
    var notFoundErr *helix.DatasetNotFoundError
    var rateLimitErr *helix.RateLimitError
    var validationErr *helix.ValidationError
    var networkErr *helix.NetworkError
    
    switch {
    case errors.As(err, &authErr):
        fmt.Printf("Authentication failed: %s\n", authErr.Message)
        fmt.Println("Please check your AWS credentials")
        
    case errors.As(err, &permErr):
        fmt.Printf("Permission denied: %s\n", permErr.Message)
        fmt.Printf("Required permission: %s\n", permErr.RequiredPermission)
        
    case errors.As(err, &notFoundErr):
        fmt.Printf("Dataset not found: %s\n", notFoundErr.DatasetID)
        
    case errors.As(err, &rateLimitErr):
        fmt.Printf("Rate limit exceeded. Retry after %d seconds\n", rateLimitErr.RetryAfter)
        
    case errors.As(err, &validationErr):
        fmt.Printf("Validation failed:\n")
        for field, msg := range validationErr.FieldErrors {
            fmt.Printf("  - %s: %s\n", field, msg)
        }
        
    case errors.As(err, &networkErr):
        fmt.Printf("Network error: %s\n", networkErr.Message)
        if networkErr.Retryable {
            fmt.Println("This error is retryable")
        }
        
    default:
        fmt.Printf("Unknown error: %v\n", err)
    }
}
```

### Retry with Backoff

```go
import (
    "errors"
    "math"
    "math/rand"
    "time"
    
    helix "github.com/helix-tools/sdk-go"
)

type RetryConfig struct {
    MaxRetries     int
    InitialBackoff time.Duration
    MaxBackoff     time.Duration
    BackoffFactor  float64
    Jitter         bool
}

func DefaultRetryConfig() *RetryConfig {
    return &RetryConfig{
        MaxRetries:     3,
        InitialBackoff: 1 * time.Second,
        MaxBackoff:     30 * time.Second,
        BackoffFactor:  2.0,
        Jitter:         true,
    }
}

func retryWithBackoff[T any](
    fn func() (T, error),
    config *RetryConfig,
) (T, error) {
    var zero T
    var lastErr error
    
    for attempt := 0; attempt <= config.MaxRetries; attempt++ {
        result, err := fn()
        if err == nil {
            return result, nil
        }
        
        lastErr = err
        
        // Check if error is retryable
        var networkErr *helix.NetworkError
        var rateLimitErr *helix.RateLimitError
        
        if errors.As(err, &rateLimitErr) {
            // Use server-provided retry time
            time.Sleep(time.Duration(rateLimitErr.RetryAfter) * time.Second)
            continue
        }
        
        if !errors.As(err, &networkErr) || !networkErr.Retryable {
            // Not retryable
            return zero, err
        }
        
        if attempt < config.MaxRetries {
            backoff := float64(config.InitialBackoff) * math.Pow(config.BackoffFactor, float64(attempt))
            if backoff > float64(config.MaxBackoff) {
                backoff = float64(config.MaxBackoff)
            }
            
            if config.Jitter {
                // Add ±25% jitter
                jitter := backoff * 0.25 * (2*rand.Float64() - 1)
                backoff += jitter
            }
            
            time.Sleep(time.Duration(backoff))
        }
    }
    
    return zero, fmt.Errorf("max retries exceeded: %w", lastErr)
}

// Usage
func downloadWithRetry(consumer *helix.Consumer, datasetID, outputPath string) error {
    _, err := retryWithBackoff(func() (struct{}, error) {
        return struct{}{}, consumer.DownloadDataset(datasetID, outputPath)
    }, DefaultRetryConfig())
    
    return err
}
```

## Production Deployment

### Configuration from Environment

```go
import (
    "os"
    "strconv"
)

type Config struct {
    AWSAccessKeyID     string
    AWSSecretAccessKey string
    CustomerID         string
    APIEndpoint        string
    Region             string
    CompressionLevel   int
    ConnectTimeout     time.Duration
    ReadTimeout        time.Duration
}

func LoadConfig() (*Config, error) {
    config := &Config{
        AWSAccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
        AWSSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
        CustomerID:         os.Getenv("HELIX_CUSTOMER_ID"),
        APIEndpoint:        getEnvOrDefault("HELIX_API_ENDPOINT", "https://api-go.helix.tools"),
        Region:             getEnvOrDefault("HELIX_REGION", "us-east-1"),
        CompressionLevel:   getEnvIntOrDefault("HELIX_COMPRESSION_LEVEL", 6),
        ConnectTimeout:     getEnvDurationOrDefault("HELIX_CONNECT_TIMEOUT", 10*time.Second),
        ReadTimeout:        getEnvDurationOrDefault("HELIX_READ_TIMEOUT", 30*time.Second),
    }
    
    if config.AWSAccessKeyID == "" {
        return nil, fmt.Errorf("AWS_ACCESS_KEY_ID is required")
    }
    if config.AWSSecretAccessKey == "" {
        return nil, fmt.Errorf("AWS_SECRET_ACCESS_KEY is required")
    }
    if config.CustomerID == "" {
        return nil, fmt.Errorf("HELIX_CUSTOMER_ID is required")
    }
    
    return config, nil
}

func getEnvOrDefault(key, defaultValue string) string {
    if value := os.Getenv(key); value != "" {
        return value
    }
    return defaultValue
}

func getEnvIntOrDefault(key string, defaultValue int) int {
    if value := os.Getenv(key); value != "" {
        if intValue, err := strconv.Atoi(value); err == nil {
            return intValue
        }
    }
    return defaultValue
}

func getEnvDurationOrDefault(key string, defaultValue time.Duration) time.Duration {
    if value := os.Getenv(key); value != "" {
        if duration, err := time.ParseDuration(value); err == nil {
            return duration
        }
    }
    return defaultValue
}
```

### Health Checks

```go
import (
    "encoding/json"
    "net/http"
    
    helix "github.com/helix-tools/sdk-go"
)

type HealthHandler struct {
    consumer *helix.Consumer
}

type HealthResponse struct {
    Status          string `json:"status"`
    HelixConnection string `json:"helix_connection,omitempty"`
    DatasetCount    int    `json:"dataset_count,omitempty"`
    Error           string `json:"error,omitempty"`
}

func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    response := HealthResponse{Status: "healthy"}
    
    if r.URL.Path == "/health/detailed" {
        datasets, err := h.consumer.ListDatasets()
        if err != nil {
            response.Status = "unhealthy"
            response.HelixConnection = "failed"
            response.Error = err.Error()
            w.WriteHeader(http.StatusServiceUnavailable)
        } else {
            response.HelixConnection = "ok"
            response.DatasetCount = len(datasets)
        }
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func main() {
    consumer, _ := helix.NewConsumer(&helix.Config{...})
    
    http.Handle("/health", &HealthHandler{consumer: consumer})
    http.Handle("/health/detailed", &HealthHandler{consumer: consumer})
    
    http.ListenAndServe(":8080", nil)
}
```

### Metrics with Prometheus

```go
import (
    "time"
    
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    
    helix "github.com/helix-tools/sdk-go"
)

var (
    downloadsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "helix_downloads_total",
            Help: "Total number of dataset downloads",
        },
        []string{"dataset_id", "status"},
    )
    
    downloadDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "helix_download_duration_seconds",
            Help:    "Time spent downloading datasets",
            Buckets: prometheus.DefBuckets,
        },
        []string{"dataset_id"},
    )
    
    downloadSize = promauto.NewHistogram(
        prometheus.HistogramOpts{
            Name:    "helix_download_size_bytes",
            Help:    "Size of downloaded datasets",
            Buckets: []float64{1e6, 10e6, 100e6, 1e9, 10e9},
        },
    )
)

func downloadWithMetrics(consumer *helix.Consumer, datasetID, outputPath string) error {
    start := time.Now()
    
    err := consumer.DownloadDataset(datasetID, outputPath)
    
    duration := time.Since(start).Seconds()
    downloadDuration.WithLabelValues(datasetID).Observe(duration)
    
    if err != nil {
        downloadsTotal.WithLabelValues(datasetID, "error").Inc()
        return err
    }
    
    downloadsTotal.WithLabelValues(datasetID, "success").Inc()
    
    // Record file size
    if info, err := os.Stat(outputPath); err == nil {
        downloadSize.Observe(float64(info.Size()))
    }
    
    return nil
}

func main() {
    // Expose metrics endpoint
    http.Handle("/metrics", promhttp.Handler())
    go http.ListenAndServe(":2112", nil)
    
    // Your application logic...
}
```

## Testing

### Unit Testing with Interfaces

```go
// Define interface for testing
type DatasetDownloader interface {
    ListDatasets() ([]helix.Dataset, error)
    DownloadDataset(datasetID, outputPath string) error
}

// Your code uses the interface
type DataProcessor struct {
    downloader DatasetDownloader
}

func (p *DataProcessor) ProcessAllDatasets(outputDir string) error {
    datasets, err := p.downloader.ListDatasets()
    if err != nil {
        return err
    }
    
    for _, ds := range datasets {
        outputPath := filepath.Join(outputDir, ds.Name+".csv")
        if err := p.downloader.DownloadDataset(ds.ID, outputPath); err != nil {
            return err
        }
    }
    
    return nil
}

// Mock for testing
type MockDownloader struct {
    Datasets      []helix.Dataset
    DownloadError error
}

func (m *MockDownloader) ListDatasets() ([]helix.Dataset, error) {
    return m.Datasets, nil
}

func (m *MockDownloader) DownloadDataset(datasetID, outputPath string) error {
    if m.DownloadError != nil {
        return m.DownloadError
    }
    // Create empty file
    return os.WriteFile(outputPath, []byte("mock data"), 0644)
}

// Test
func TestProcessAllDatasets(t *testing.T) {
    mock := &MockDownloader{
        Datasets: []helix.Dataset{
            {ID: "ds-1", Name: "test"},
        },
    }
    
    processor := &DataProcessor{downloader: mock}
    
    tmpDir := t.TempDir()
    err := processor.ProcessAllDatasets(tmpDir)
    
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    
    expectedFile := filepath.Join(tmpDir, "test.csv")
    if _, err := os.Stat(expectedFile); os.IsNotExist(err) {
        t.Fatal("expected file was not created")
    }
}
```

### Integration Testing

```go
//go:build integration

package helix_test

import (
    "os"
    "testing"
    
    helix "github.com/helix-tools/sdk-go"
)

func TestIntegration_ListDatasets(t *testing.T) {
    if os.Getenv("HELIX_TEST_ENABLED") == "" {
        t.Skip("Integration tests disabled")
    }
    
    consumer, err := helix.NewConsumer(&helix.Config{
        AWSAccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
        AWSSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
        CustomerID:         os.Getenv("HELIX_CUSTOMER_ID"),
    })
    if err != nil {
        t.Fatalf("failed to create consumer: %v", err)
    }
    
    datasets, err := consumer.ListDatasets()
    if err != nil {
        t.Fatalf("failed to list datasets: %v", err)
    }
    
    t.Logf("Found %d datasets", len(datasets))
}
```

Run with:
```bash
HELIX_TEST_ENABLED=1 go test -tags=integration -v ./...
```

## Next Steps

- [Go Installation](/go/installation) — Setup and configuration
- [Go Usage Guide](/go/usage) — Core API usage
- [Common Patterns](/common-patterns) — Integration recipes
- [Troubleshooting](/troubleshooting) — Common issues and solutions
