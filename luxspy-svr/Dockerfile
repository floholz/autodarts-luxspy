# Build stage
FROM golang:1.23-alpine AS builder

# Add labels for GitHub Container Registry
LABEL org.opencontainers.image.source="https://github.com/floholz/autodarts-luxspy"
LABEL org.opencontainers.image.title="Luxspy Server"
LABEL org.opencontainers.image.description="Luxspy Server"
LABEL org.opencontainers.image.authors="floholz"
LABEL org.opencontainers.image.vendor="floholz"
LABEL org.opencontainers.image.version="0.1.0"
LABEL org.opencontainers.image.created="2025-08-03"

WORKDIR /app

# Copy go mod files
COPY go.mod ./
#COPY go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o luxspy-server .

# Production stage
FROM alpine:latest

# Install ca-certificates for HTTPS requests
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/luxspy-server .

# Expose port 3181
EXPOSE 3181

# Run the binary
CMD ["./luxspy-server"] 