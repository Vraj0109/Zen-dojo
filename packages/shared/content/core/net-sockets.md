---
id: net-sockets
title: Sockets and the request path
area: core
section: Computer networks
---

## Overview

Sockets are the OS interface to the network. Tracing a request end to end and knowing where time goes is a classic question and the basis of latency reasoning in designs.

## What to know

1. What happens when you type a URL :: Browser cache → DNS resolution → TCP handshake → TLS handshake → HTTP request → (CDN or load balancer → app server → cache or database) → response → the browser parses HTML and fetches more resources over the same or new connections. Mention caching at each step and what HTTP/2 or 3 change.

2. Sockets: bind, listen, accept, connect :: A server calls socket() → bind(address, port) → listen(backlog) → accept() (returns a new socket per client connection). A client calls socket() → connect(server). Then both read and write. A listening socket serves many connections, each identified by the 4-tuple (src IP, src port, dst IP, dst port).

3. Connection pooling :: Opening a connection costs TCP plus TLS round trips and a slow start, so clients keep a pool of open connections to databases and services and reuse them. Size pools carefully: too small means queueing, too large overloads the database (each Postgres connection is a process).

4. Latency sources along the path :: DNS lookup, TCP and TLS handshakes (round trips × RTT), queueing at load balancers and servers, application processing, database queries, serialization, and bandwidth for large payloads. Distance sets the minimum (about 1 ms RTT per 100 km of fiber), so cut round trips and move data closer (CDN, regional deployments).

## Recap

- Server: socket → bind → listen → accept (new socket per connection). Client: socket → connect.
- Listen backlog holds completed handshakes waiting for accept().
- Connection pools reuse TCP/TLS connections to DBs and services.
- Latency budget: DNS + TCP + TLS + queueing + server work + response transfer.

## Go deeper

### Typing a URL, the full answer {point: 0}

1) Browser checks its caches (HSTS forces https). 2) DNS resolves the host (browser, OS, resolver caches, then recursive lookup). 3) TCP handshake to the IP (often a CDN or load balancer). 4) TLS handshake, SNI selects the certificate; ALPN picks HTTP/2 or HTTP/3. 5) HTTP request with cookies; the edge serves from cache or forwards to the origin through the load balancer to an app server, which may hit caches and databases. 6) Response streams back; the browser parses HTML, fetches CSS/JS/images (more requests, often on the same connection), builds the DOM and CSSOM, runs JS, lays out and paints.

Go deep on whichever part the interviewer cares about.

### The socket API, server and client {point: 1}

Server: socket() creates an endpoint; setsockopt() configures it (SO_REUSEADDR so restarts can rebind while old connections sit in TIME_WAIT; SO_REUSEPORT to let several processes accept on one port with kernel load balancing); bind() attaches an address and port; listen() marks it passive with a backlog (the queue of fully established connections waiting for accept, capped by somaxconn); accept() returns a new connected socket per client, while the listening socket keeps listening. Then read/write (or recv/send) on the connected socket, and close().

Client: socket(), optionally bind() to choose a source address, connect() performs the TCP handshake (choosing an ephemeral source port), then read/write.

A connection is identified by the 4-tuple (source IP, source port, destination IP, destination port), which is why one server port can serve many clients, and why one client talking to one server IP:port is limited by its ephemeral port range (~28k-60k concurrent connections per destination).

```
int srv = socket(AF_INET, SOCK_STREAM, 0);
int one = 1; setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &one, sizeof one);
sockaddr_in addr{}; addr.sin_family = AF_INET; addr.sin_port = htons(8080); addr.sin_addr.s_addr = INADDR_ANY;
bind(srv, (sockaddr*)&addr, sizeof addr);
listen(srv, 512);                                   // backlog
for (;;) {
    int c = accept(srv, nullptr, nullptr);          // new socket per client
    char buf[4096]; ssize_t n = read(c, buf, sizeof buf);
    const char* resp = "HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok";
    write(c, resp, strlen(resp));
    close(c);
}
```

### Connection pooling {point: 2}

Opening a Postgres connection costs a TCP + TLS handshake plus authentication and a backend process (~several ms and memory on the server). A pool keeps N open connections and lends them out per query/transaction. Size it to what the database can handle: total connections across all app instances must stay under the DB's limit, which is why large fleets add a pooler (PgBouncer) in front.

HTTP clients pool too: reusing keep-alive or HTTP/2 connections avoids repeated handshakes and slow start.

### Connection pooling and keep-alive in services {point: 2.5}

Opening connections is expensive: TCP + TLS handshakes cost round trips, databases spend memory and sometimes a process per connection, and new connections start with small congestion windows. Pools keep a set of open connections and lend them out.

Sizing: a database pool needs only enough connections to keep the database busy; more connections than the database's cores × a small factor cause contention rather than throughput (the classic formula for Postgres is roughly cores × 2 + effective spindles). Across 50 app instances × 20 connections = 1,000 connections, which overwhelms Postgres, so add a pooler (PgBouncer in transaction mode) or reduce per-instance pools. Set timeouts for acquiring a connection (fail fast instead of piling up), validate idle connections, and cap connection lifetime so pools rebalance after failovers.

HTTP clients: reuse clients (don't create one per request), configure maximum connections per host, idle timeouts shorter than the server's (avoid sending on a connection the server just closed), and prefer HTTP/2 to multiplex many requests over few connections.

### Latency along the request path {point: 3}

Break a request's latency into parts and you know what to optimize. Client side: DNS lookup (0 if cached, tens of ms if not), TCP handshake (1 RTT), TLS handshake (1 RTT for TLS 1.3), request upload (size / bandwidth + RTT effects of slow start), server time, response download, and client processing/rendering. Server side: load balancer hop (~0.1-1 ms), queueing in the server (requests waiting for a worker; grows sharply as utilization approaches 100%), application logic, calls to caches (~0.5-1 ms each in the same zone), databases (1-10 ms typical), and other services, each adding network RTTs and their own queueing.

Tail latency: with many dependencies called in parallel, the slowest one decides (if each call has a 1% chance of being slow, a request fanning out to 100 calls is slow 63% of the time). Mitigations: hedged requests (send a duplicate after the p95 time and take the first answer), timeouts, reducing fan-out, caching, and keeping services in the same zone. Measure with distributed tracing to see where the time actually goes.

## Interview questions

- What happens when you type a URL and press Enter? Go as deep as you can.
- Why use a connection pool for the database?
