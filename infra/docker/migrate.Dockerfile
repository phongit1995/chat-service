FROM golang:1.24.5-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/migrations ./cmd/migrations

FROM alpine:latest

WORKDIR /app

RUN apk --no-cache add ca-certificates tzdata

COPY --from=builder /app/bin/migrations /app/migrations
COPY --from=builder /app/cmd/migrations/postgres /app/cmd/migrations/postgres
COPY --from=builder /app/cmd/migrations/scylla /app/cmd/migrations/scylla

ENV TZ=Asia/Ho_Chi_Minh
ENV MIGRATION_ACTION=up
ENV MIGRATE_DB=all
ENV MIGRATION_STEPS=0

ENTRYPOINT ["/app/migrations"]
CMD ["up", "all"]

