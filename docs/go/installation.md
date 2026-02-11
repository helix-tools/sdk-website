---
sidebar_position: 1
---

# Go Installation

The official Go SDK for the Helix Connect data marketplace platform.

## Prerequisites

- Go 1.21 or higher
- AWS credentials (provided during customer onboarding)
- Helix Connect customer ID (UUID format)

## Installation

```bash
go get github.com/helix-tools/sdk-go
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
export HELIX_REGION="us-east-1"
```

### Programmatic Configuration

```go
package main

import (
    "os"
    
    helix "github.com/helix-tools/sdk-go"
)

func main() {
    config := &helix.Config{
        AWSAccessKeyID:     os.Getenv("AWS_ACCESS_KEY_ID"),
        AWSSecretAccessKey: os.Getenv("AWS_SECRET_ACCESS_KEY"),
        CustomerID:         os.Getenv("HELIX_CUSTOMER_ID"),
        
        // Optional
        APIEndpoint: "https://api-go.helix.tools",
        Region:      "us-east-1",
    }
    
    consumer, err := helix.NewConsumer(config)
    if err != nil {
        panic(err)
    }
    
    // Use consumer...
}
```

## Verify Installation

```go
package main

import (
    "fmt"
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
        fmt.Printf("Failed to create consumer: %v\n", err)
        os.Exit(1)
    }
    
    // Validate credentials by listing datasets
    datasets, err := consumer.ListDatasets()
    if err != nil {
        fmt.Printf("Failed to list datasets: %v\n", err)
        os.Exit(1)
    }
    
    fmt.Printf("Connected! Found %d datasets.\n", len(datasets))
}
```

## Project Structure

Typical project layout:

```
your-project/
├── go.mod
├── go.sum
├── main.go
└── data/
    └── (downloaded datasets)
```

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** or AWS Secrets Manager
3. **Rotate credentials** regularly
4. **Use IAM roles** when running on AWS infrastructure
5. **Handle errors appropriately** - don't expose internal errors

## Next Steps

- [Go Usage Guide](/go/usage) - Consumer and Producer APIs
- [Getting Started](/) - Overview of all SDKs
