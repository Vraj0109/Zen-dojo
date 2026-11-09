---
id: net-http
title: HTTP
area: core
section: Computer networks
---

## Overview

HTTP is the application protocol of most APIs. Know method semantics, status codes, caching headers and how connections are reused across HTTP versions.

## What to know

1. Methods, idempotency and status codes :: GET reads (safe, idempotent, cacheable); PUT replaces (idempotent); DELETE (idempotent); POST creates or acts (not idempotent); PATCH partially updates. Status codes: 2xx success (200, 201 Created, 204), 3xx redirect (301, 302, 304 Not Modified), 4xx client error (400, 401 unauthenticated, 403 forbidden, 404, 409 conflict, 429), 5xx server error (500, 502, 503, 504).

2. Headers, caching (Cache-Control, ETag) :: Cache-Control (max-age, no-store, private/public, s-maxage for CDNs) controls caching. ETag or Last-Modified enable conditional requests: the client sends If-None-Match, and the server answers 304 with no body if nothing changed. Vary says which request headers change the response.

3. Cookies and CORS :: Cookies carry state such as session ids; secure them with HttpOnly (no JavaScript access), Secure (HTTPS only) and SameSite (CSRF protection). CORS: browsers block cross-origin requests unless the server allows the origin with Access-Control-Allow-Origin; non-simple requests send a preflight OPTIONS first. CORS protects users' browsers, not your API.

4. Keep-alive, HTTP/2 multiplexing, HTTP/3 :: HTTP/1.1 keep-alive reuses a TCP connection for sequential requests. HTTP/2 multiplexes many concurrent requests over one connection with compressed headers. HTTP/3 does the same over QUIC without TCP head-of-line blocking.

## Recap

- Safe: GET/HEAD. Idempotent: GET, PUT, DELETE. Not idempotent: POST, PATCH (usually).
- 2xx ok, 3xx redirect, 4xx client error (400, 401, 403, 404, 409, 429), 5xx server (500, 502, 503, 504).
- Cache-Control: max-age, no-store, private/public; ETag + If-None-Match → 304.
- CORS: the browser enforces it; the server opts in with Access-Control-Allow-* headers.

## Go deeper

### Methods, semantics and status codes {point: 0}

GET retrieves a representation; it must be safe (no side effects the client is responsible for) and is cacheable. HEAD is GET without the body. POST submits data for processing: create a resource, trigger an action; not idempotent by default. PUT replaces the target resource with the request body; idempotent (sending it twice has the same effect). PATCH applies partial modifications; idempotency depends on the patch format. DELETE removes; idempotent (a second delete may return 404, but the state is the same). OPTIONS describes communication options (used by CORS preflight).

Status classes: 1xx informational (100 Continue, 101 Switching Protocols for WebSocket upgrade), 2xx success (200 OK, 201 Created, 202 Accepted, 204 No Content), 3xx redirection (301 permanent, 302/303 temporary, 304 Not Modified, 307/308 preserve method), 4xx client errors (400, 401, 403, 404, 405 Method Not Allowed, 409 Conflict, 410 Gone, 412 Precondition Failed, 413 Payload Too Large, 415, 422, 429), 5xx server errors (500, 502 Bad Gateway from a proxy, 503 Service Unavailable, 504 Gateway Timeout).

Retries: clients and proxies may automatically retry idempotent requests on network errors, which is why non-idempotent operations need idempotency keys.

### Caching headers that work {point: 1}

Fingerprinted static assets (app.3f9a1c.js): Cache-Control: public, max-age=31536000, immutable, because the URL changes when the content does. HTML: Cache-Control: no-cache (store but revalidate each time) with an ETag, so unchanged pages cost a 304 with no body. Personalized API responses: Cache-Control: private, no-store. Shared caches (CDN) can use s-maxage and stale-while-revalidate to serve slightly stale content while refreshing in the background.

### CORS preflight {point: 2}

A page on app.shop.com calls api.shop.com with JSON and an Authorization header: the browser first sends OPTIONS with Origin, Access-Control-Request-Method and -Headers. The API must answer with Access-Control-Allow-Origin: https://app.shop.com (not * when credentials are involved), allowed methods and headers, and optionally Access-Control-Max-Age to cache the preflight.

CORS protects users' browsers from other sites reading responses; it isn't server-side security; curl ignores it entirely.

### Cookies, sessions and CORS in more depth {point: 2.5}

Set-Cookie attributes: Domain and Path scope where it's sent; Expires/Max-Age make it persistent (otherwise a session cookie); Secure sends only over HTTPS; HttpOnly hides it from JavaScript (mitigates token theft via XSS); SameSite controls cross-site sending: Strict (never cross-site), Lax (top-level navigations only, the browser default), None (always, requires Secure). Third-party cookies are being phased out by browsers.

Same-origin policy: scripts can read responses only from the same origin (scheme + host + port). CORS lets a server relax that for specific origins. Simple requests (GET/POST with simple headers and content types) are sent directly, and the browser blocks reading the response unless Access-Control-Allow-Origin matches. Others trigger a preflight OPTIONS request first. With credentials (cookies), the server must echo the specific origin and set Access-Control-Allow-Credentials: true; wildcards aren't allowed.

CSRF exploits the browser sending cookies on cross-site requests; defenses are SameSite cookies, CSRF tokens, and checking Origin/Referer headers on state-changing requests.

### Connection management and performance {point: 3}

HTTP/1.1 keep-alive reuses a TCP (and TLS) connection for many sequential requests, avoiding repeated handshakes. Browsers open up to 6 connections per origin to get parallelism. HTTP/2 multiplexes requests over one connection: no need for domain sharding or bundling everything into one file, header compression (HPACK) shrinks repetitive headers, and server push (now deprecated in browsers) tried to send resources proactively. HTTP/3 removes TCP head-of-line blocking.

Other performance tools: compression (gzip, Brotli; don't compress already-compressed images), caching headers and ETags, CDNs, preconnect/preload hints, 103 Early Hints, and range requests for large files and resumable downloads.

On the server side, proxies and services should reuse upstream connections (pooling), set sensible timeouts (connect, read, idle), and limit request sizes. Slowloris-style attacks hold many connections open sending headers very slowly; reverse proxies buffer and time out such clients before they reach application servers.

## Interview questions

- PUT vs POST vs PATCH?
- 401 vs 403?
- How does an ETag save bandwidth?
- What problem does CORS solve?
