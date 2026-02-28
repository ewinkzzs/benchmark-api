FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server .

# ✅ Ganti FROM scratch → FROM alpine
FROM alpine:3.19

# Wajib untuk koneksi SSL & DNS resolution
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /root/
COPY --from=builder /app/server .

EXPOSE 8080
ENTRYPOINT ["./server"]