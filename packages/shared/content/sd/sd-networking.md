---
id: sd-networking
title: Networking
area: sd
section: A. Fundamentals
---

## Overview

Every design sits on the network path: client → DNS → CDN/edge → load balancer → service → data store. Know what each hop costs and what it can do for you (caching, TLS termination, routing), because latency and failure modes come from here.

## What to know

1. TCP vs UDP :: TCP gives an ordered, reliable byte stream with flow and congestion control, at the cost of a handshake and head-of-line blocking. UDP sends independent datagrams with no delivery guarantee; use it when late data is useless (voice, video, games) or when you build reliability yourself (QUIC).

2. HTTP/1.1 vs HTTP/2 vs HTTP/3 :: HTTP/1.1 allows one in-flight request per connection, so browsers open ~6 connections. HTTP/2 multiplexes many streams over one TCP connection with header compression, but a lost TCP packet stalls every stream. HTTP/3 runs over QUIC (UDP), so streams are independent and connection setup is faster.

3. TLS handshake :: TLS 1.3 needs one round trip: the client sends supported ciphers and a key share, the server replies with its key share and certificate, and both derive symmetric keys (ECDHE). Asymmetric crypto is only used to agree on keys; bulk data uses fast symmetric encryption (AES-GCM). Resumption allows 0-RTT.

4. DNS resolution :: The resolver checks its cache, then asks a root server, the TLD server (.com) and the domain's authoritative server, caching each answer for its TTL. Low TTLs allow fast failover but cost more lookups; DNS can return different IPs per region (GeoDNS) to route users nearby.

5. CDN :: A CDN caches content at edge locations close to users, cutting latency and origin load. Static assets are the obvious case; it can also cache API responses with short TTLs, terminate TLS, absorb DDoS traffic and run edge logic. Invalidate by versioned URLs rather than purges where possible.

6. Load balancing (L4 vs L7) :: L4 balancers route by IP and port without reading the payload: very fast, protocol-agnostic. L7 balancers parse HTTP, so they can route by path or header, terminate TLS, retry, and do sticky sessions. Common algorithms: round robin, least connections, consistent hashing (for cache affinity).

7. Proxies and reverse proxies :: A forward proxy acts for clients (corporate egress, anonymity). A reverse proxy sits in front of servers and acts for them: TLS termination, compression, caching, rate limiting, routing to backends. Nginx, Envoy and HAProxy are typical; an API gateway is a reverse proxy with auth and API-level policies.

## Recap

- Request path: DNS → CDN/edge → L4/L7 load balancer → service → cache/DB.
- TCP handshake 1 RTT + TLS 1.3 1 RTT before the first byte; reuse connections.
- HTTP/2 multiplexes but suffers TCP head-of-line blocking; HTTP/3 (QUIC over UDP) fixes it.
- L4 = fast, protocol-agnostic; L7 = route by path/header, TLS termination, retries.

## Go deeper

### Worked example: what a cold request costs {point: 0}

User in Mumbai, origin in us-east (≈200 ms RTT). Cold: DNS lookup (cache miss, ~50-100 ms), TCP handshake (1 RTT = 200 ms), TLS 1.3 (1 RTT = 200 ms), request + response (1 RTT = 200 ms) → ~650 ms before any server time.

With a CDN PoP in Mumbai (≈10 ms RTT) terminating TLS and keeping warm connections to the origin: handshakes cost ~20 ms, and cached content returns in ~30 ms total. That's why designs put TLS termination and caching at the edge, and why connection reuse (keep-alive, HTTP/2) matters more than raw bandwidth.

### TCP vs UDP in detail {point: 0}

TCP turns an unreliable packet network into a reliable, ordered byte stream. The handshake (SYN, SYN-ACK, ACK) agrees on starting sequence numbers. Every byte has a sequence number; the receiver acknowledges what it has received in order (cumulative ACKs), and the sender retransmits anything not acknowledged in time or after three duplicate ACKs (fast retransmit). Flow control uses the receiver's advertised window so a fast sender can't overflow a slow receiver; congestion control (slow start, then additive increase / multiplicative decrease, or BBR) keeps the sender from overwhelming the network.

The costs: one round trip before any data, head-of-line blocking (a lost segment holds back everything after it, even data for unrelated requests), and per-connection state in the kernel. That's why connection reuse matters and why HTTP/3 moved to QUIC.

UDP sends independent datagrams with an 8-byte header: no handshake, no ordering, no retransmission, no congestion control. The application decides what to do with loss. It fits DNS (one small question, one small answer, retry on timeout), real-time media (a late voice packet is worthless), games (send the latest state, ignore old), and protocols that build their own reliability (QUIC, many VPNs). In a design, say UDP only when late data is useless or you're consciously re-implementing reliability.

### HTTP versions and what they change for a system {point: 1}

HTTP/1.1 keeps connections alive but serves one request at a time per connection (pipelining exists but is effectively unused), so browsers open about 6 connections per host and developers used tricks like domain sharding and sprite sheets. Each response is text headers plus a body; headers repeat on every request.

HTTP/2 is binary and multiplexes many streams over one TCP connection, with HPACK header compression and stream priorities. One connection per host is enough, which reduces handshakes and helps TLS and congestion windows warm up. Its weakness is TCP: a single lost packet stalls every stream on the connection, which hurts on lossy mobile networks. gRPC is built on HTTP/2 and uses its streaming.

HTTP/3 runs HTTP over QUIC on UDP. Streams are independent at the transport level, so loss on one doesn't block the others; the transport and TLS 1.3 handshakes are combined (1 RTT, 0-RTT on resumption); and connections survive IP changes (Wi-Fi to cellular) because they're identified by connection IDs. The cost is more CPU in user space and some networks that block or throttle UDP, so clients fall back to HTTP/2.

For a design answer: terminate HTTP/2 or HTTP/3 at the edge (CDN or load balancer) for clients, and use HTTP/2 or gRPC with long-lived pooled connections between internal services.

### CDNs, proxies and gateways: what sits where {point: 4}

A CDN is a network of edge servers (PoPs) near users. With a pull CDN, the edge fetches from your origin on the first miss and caches according to Cache-Control; with a push CDN you upload content ahead of time. Static assets get long TTLs with versioned file names; HTML and API responses get short TTLs or are passed through. CDNs also terminate TLS close to the user, absorb DDoS traffic, apply WAF rules, and can run small functions at the edge (redirects, A/B bucketing, auth token checks). Origin shielding (one regional cache in front of the origin) stops every PoP from hitting the origin on a miss.

A reverse proxy (Nginx, Envoy, HAProxy) sits in front of your servers: TLS termination, compression, routing by host/path, request buffering (protects app servers from slow clients), caching, rate limiting, retries and health-checked load balancing. A forward proxy sits in front of clients (corporate egress, outbound allow-lists, outgoing request logging).

An API gateway is a reverse proxy specialized for APIs: authentication (validate JWT or API keys), per-client quotas, request validation, routing to services, protocol translation (REST to gRPC), and API analytics. A service mesh handles the same concerns between internal services with sidecar proxies.

Typical layering: DNS → CDN/WAF → regional L4 load balancer → L7 gateway → services → caches and databases. Draw it once early in a design and refer back to it.

### Load balancer algorithms and when each fits {point: 5}

Round robin: equal servers, similar requests. Weighted round robin: mixed instance sizes. Least connections / least outstanding requests: long or uneven requests (uploads, streaming). Power of two choices: pick two random servers, send to the less loaded; nearly as good as least-connections with no global state. Consistent hashing on a key: cache affinity (same user → same cache node) at the cost of uneven load for hot keys.

Health checks remove dead backends; connection draining lets in-flight requests finish during deploys. The balancer itself is made redundant with an active-passive pair sharing a virtual IP, or several balancers behind DNS / anycast.

## Interview questions

- Walk me through what happens when a user types example.com and presses Enter.
- When would you choose an L4 over an L7 load balancer?
- Why can HTTP/2 be slower than HTTP/1.1 on a lossy mobile network?
- How would you serve users in Asia and Europe with low latency?

## Common mistakes

- Forgetting that the load balancer itself must be redundant (active-passive pair or DNS across several).
- Using very long DNS TTLs and then being unable to fail over quickly.
