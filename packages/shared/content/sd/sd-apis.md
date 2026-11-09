---
id: sd-apis
title: APIs
area: sd
section: A. Fundamentals
---

## Overview

The API is the contract between clients and your system. Interviewers look for clear resources, safe retries (idempotency), sensible pagination and the right real-time mechanism for the use case.

## What to know

1. REST vs gRPC vs GraphQL :: REST: resources and HTTP verbs, cacheable, universal; the default for public APIs. gRPC: Protobuf over HTTP/2, typed contracts, streaming, fast; good between internal services. GraphQL: the client asks for exactly the fields it needs in one round trip; good for varied frontends, but harder to cache and to protect from expensive queries.

2. Idempotency keys :: The client sends a unique Idempotency-Key with a non-idempotent request (e.g. POST /payments). The server stores key → result; a retry with the same key returns the stored result instead of charging twice. Store keys with a TTL (e.g. 24 h) and make the 'check and insert' atomic.

3. Pagination (offset, cursor, keyset) :: Offset pagination (LIMIT 20 OFFSET 1000) is simple but slow for deep pages and skips or repeats rows when data changes. Cursor/keyset pagination (WHERE id < last_seen ORDER BY id DESC LIMIT 20) uses an index, is stable under inserts, and scales; return an opaque cursor to the client.

4. Versioning :: Version so old clients keep working: in the URL (/v1/…), a header, or by only making backward-compatible changes (add optional fields, never remove or rename). Deprecate with a timeline and usage metrics.

5. Rate limiting :: Protect the API from abuse and noisy clients by limiting requests per key, user or IP. Return 429 Too Many Requests with Retry-After. Usually enforced at the gateway with a token bucket backed by Redis.

6. Webhooks :: Webhooks push events to a URL the customer registers, instead of the customer polling. Sign payloads (HMAC) so receivers can verify them, retry with backoff, and expect receivers to dedupe because delivery is at-least-once.

7. Long polling vs SSE vs WebSockets :: Long polling: the client's request is held open until there's data, then it re-requests; works everywhere. Server-Sent Events: one long-lived HTTP response streaming server→client events; simple, auto-reconnects. WebSockets: full-duplex over one connection; needed for chat or games, but stateful connections complicate load balancing.

## Recap

- Public: REST; internal service-to-service: gRPC; many client shapes: GraphQL.
- POST + Idempotency-Key header, server stores key → response for ~24 h.
- Cursor pagination for feeds: WHERE (created_at, id) < cursor ORDER BY … LIMIT n.
- Chat/games → WebSockets; one-way live updates → SSE; fallback → long polling.

## Go deeper

### Designing resources and endpoints {point: 0}

Start from the use cases and turn nouns into resources: /users/{id}, /orders/{id}, /orders/{id}/items. Use HTTP methods for intent: GET reads (safe, cacheable), POST creates or triggers actions, PUT replaces, PATCH updates partially, DELETE removes. Return the created resource's id and location on POST (201 Created + Location header).

Good status codes help clients: 400 for invalid input (with field-level errors), 401 for missing/invalid credentials, 403 for authenticated but not allowed, 404 for missing resources (or to hide existence), 409 for conflicts (version mismatch, duplicate), 422 for semantically invalid requests, 429 for rate limits, 503 for temporary unavailability with Retry-After.

Use a consistent error body ({code, message, details, requestId}) so clients and support can correlate with logs. Accept and return timestamps in ISO-8601 UTC, money as integer minor units with a currency code, and ids as opaque strings so you can change their format later.

For actions that aren't CRUD (cancel an order, retry a payment), either model them as sub-resources (POST /orders/{id}/cancellation) or as explicit action endpoints; both are fine if consistent. For long-running work, return 202 Accepted with a job/operation resource the client can poll or be notified about.

### gRPC and GraphQL in more depth {point: 0}

gRPC defines services and messages in Protobuf. Code is generated for clients and servers, so contracts are typed and changes are checked at compile time. Messages are compact binary, and HTTP/2 enables four call types: unary, server streaming, client streaming and bidirectional streaming. Deadlines propagate across calls, and status codes are standardized. Protobuf evolves safely when you only add fields with new numbers and never reuse removed numbers. Downsides: browsers can't call gRPC directly (gRPC-Web or a gateway translates), payloads aren't human-readable, and HTTP caching doesn't apply.

GraphQL exposes a typed schema; clients send a query naming exactly the fields they need, possibly across related objects, in one round trip. That's great for mobile and for many different frontends. Costs: every query is a POST to one endpoint, so CDN caching needs persisted queries; resolvers can trigger N+1 database calls unless batched with a DataLoader; and arbitrary queries can be expensive, so you need depth/complexity limits and timeouts. Authorization must be enforced per field or per resolver.

A common real-world split: GraphQL or REST at the edge for clients (often a backend-for-frontend per app), gRPC between internal services, and events (Kafka) for asynchronous integration.

### Idempotency end to end {point: 1}

Client generates a UUID per logical operation and retries with the same key. Server: INSERT INTO idempotency(key, status='in_progress') ON CONFLICT DO NOTHING. If the insert won, do the work and store the response; if it lost, return the stored response (or 409 if still in progress). Wrap 'do the work + store response' in one transaction when they share a database.

Scope keys per user/merchant so two customers can't collide, compare the request body hash so the same key with a different payload is rejected (422), and expire keys after a window.

```
POST /v1/payments
Idempotency-Key: 8f14e45f-ea5f-4b6e-9a2c-1c7d2f1b9e10
{ "amount": 4999, "currency": "INR", "source": "card_123" }

-- server side
BEGIN;
INSERT INTO idem_keys(merchant_id, key, req_hash, status)
VALUES ($1, $2, $3, 'in_progress')
ON CONFLICT (merchant_id, key) DO NOTHING;   -- 0 rows → replay stored response
-- ... charge, write ledger ...
UPDATE idem_keys SET status='done', response=$4 WHERE merchant_id=$1 AND key=$2;
COMMIT;
```

### Keyset pagination with ties {point: 2}

Sorting by created_at alone breaks when two rows share a timestamp. Sort by (created_at DESC, id DESC) and encode both in the cursor. The query uses a composite index and costs the same on page 1 and page 10,000, while OFFSET 200000 scans and throws away 200k rows.

Return next_cursor = base64({created_at, id}) of the last row. You can't jump to page N; for UIs that need it, cap offsets (e.g. 10 pages) or precompute page boundaries.

```
SELECT id, created_at, body FROM posts
WHERE user_id = $1 AND (created_at, id) < ($2, $3)
ORDER BY created_at DESC, id DESC
LIMIT 20;
-- index: (user_id, created_at DESC, id DESC)
```

### Webhooks and real-time delivery, done reliably {point: 5}

Webhooks: the provider POSTs an event to a URL the customer configured. Make them dependable on both sides. Provider side: put events on a queue, deliver with a short timeout, retry with exponential backoff for hours or days, give up into a dead-letter list visible in a dashboard, and let customers replay events. Sign each payload with HMAC-SHA256 over the body and a timestamp; receivers verify the signature and reject old timestamps to stop replays. Send an event id so receivers can dedupe, because delivery is at-least-once and order isn't guaranteed (include a version or timestamp so receivers can ignore stale updates).

Receiver side: verify the signature, store the event, return 2xx quickly, then process asynchronously. Never do slow work before answering.

Real-time to browsers and apps: long polling works everywhere but costs a request per message batch. Server-Sent Events stream text events over one HTTP response and reconnect automatically with Last-Event-ID, which suits notifications, feeds and progress updates (server to client only). WebSockets give full-duplex messages for chat, collaboration and games. Because WebSocket connections are stateful and long-lived, you need a connection registry (which gateway holds which user), heartbeats, reconnect with resume from the last received message id, and load balancers configured for long connections. Mobile apps in the background rely on push notifications (APNs/FCM) instead.

## Interview questions

- Design the API for creating a payment so that client retries are safe.
- Why is offset pagination a problem for a feed, and what would you use instead?
- Chat app: WebSockets, SSE or long polling? Why?

## Common mistakes

- Making POST retries unsafe; network timeouts mean clients will retry.
- Returning unbounded lists with no pagination.
