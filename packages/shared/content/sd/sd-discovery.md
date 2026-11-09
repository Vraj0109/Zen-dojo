---
id: sd-discovery
title: Service discovery and config
area: sd
section: C. Building blocks
---

## Overview

In a fleet where instances come and go, services need to find each other and get configuration without hardcoded addresses. Discovery, config and the mesh or gateway layer handle routing, retries and security between services.

## What to know

1. DNS :: The simplest approach: a stable DNS name resolves to healthy instances or a load balancer. Kubernetes Services work this way. Drawbacks: TTL caching delays updates, and plain DNS doesn't do load-aware routing.

2. Consul, etcd :: Services register themselves (with health checks) in a strongly consistent registry (Consul, etcd, ZooKeeper); clients or sidecars watch it for changes. The same stores hold dynamic configuration and feature flags, pushed to services without redeploys.

3. Service mesh (Envoy, Istio) :: A sidecar proxy (Envoy) next to each service handles traffic: mTLS, retries, timeouts, circuit breaking, load balancing and telemetry. A control plane (Istio) configures all the sidecars. Consistent policy without library changes, at the cost of operational complexity and a little latency.

4. API gateway :: A single entry point for external clients: routing to internal services, authentication, rate limiting, request aggregation, protocol translation. It keeps those concerns out of every service, but must be highly available and must not turn into a monolith of business logic.

## Recap

- Services register with a registry (Consul/etcd/Kubernetes); clients resolve by name.
- Client-side discovery (client picks instance) vs server-side (load balancer picks).
- Service mesh: sidecar proxy (Envoy) does mTLS, retries, timeouts, metrics per call.
- API gateway at the edge: auth, rate limits, routing, request shaping.

## Go deeper

### Discovery mechanisms {point: 0}

Services need to find healthy instances of other services whose addresses change as they scale and redeploy.

DNS-based: each service has a DNS name returning instance IPs (Kubernetes headless services, Consul DNS, AWS Cloud Map). Universal and simple, but clients cache answers and DNS can't express load or health quickly.

Registry-based: instances register with a registry (Consul, etcd, Eureka) and send heartbeats; clients query or watch the registry and load-balance themselves (client-side discovery), or a load balancer does it for them (server-side discovery). Health checks remove failed instances.

Platform-native: in Kubernetes, a Service gets a stable virtual IP and DNS name; kube-proxy or the CNI routes to ready pods; Endpoints/EndpointSlices track membership. Most designs on Kubernetes need nothing else.

Service mesh: the sidecar proxies get endpoints from the control plane (Istio's istiod via xDS) and do load balancing, retries and mTLS, so application code just calls a name.

### How Kubernetes does it {point: 1}

A Deployment runs pods with changing IPs. A Service gives them one stable virtual IP and DNS name (orders.prod.svc.cluster.local); kube-proxy routes the virtual IP to healthy pod IPs, and readiness probes decide which pods are in rotation. Config and secrets are mounted from ConfigMaps/Secrets, changed by rolling restarts or watched at runtime.

A mesh (Istio/Linkerd) adds a sidecar per pod so every call gets mTLS, retries, timeouts, circuit breaking and tracing without app code changes, at the cost of extra latency (~1 ms per hop) and operational complexity.

### Gateway vs mesh responsibilities {point: 2}

North-south (client → system) goes through the API gateway: authentication, per-client rate limits, API keys, request validation, routing to services, response caching, protocol translation (REST → gRPC).

East-west (service → service) goes through the mesh or client libraries: service identity (mTLS), retries with budgets, timeouts, load balancing, telemetry. Saying which concern lives where avoids putting business logic in the gateway.

### API gateway responsibilities and pitfalls {point: 3}

At the edge, a gateway terminates TLS, authenticates (validates JWTs, API keys, OAuth tokens), enforces quotas and rate limits per client, validates and transforms requests, routes to services by path/host/header, aggregates responses for some endpoints (backend for frontend), adds observability (request ids, metrics, logs) and can cache responses. Products: Kong, Envoy-based gateways, AWS API Gateway, Apigee, Nginx.

Pitfalls: putting business logic in the gateway (it becomes a monolith every team must change); making it a single point of failure (run many stateless instances across zones); adding too many hops (gateway → mesh → service) without measuring latency; and coupling all teams to one gateway configuration (use per-team routing config with ownership).

### Configuration management

Separate config from code: values that differ by environment (endpoints, limits, feature flags, credentials references) come from environment variables, mounted files, or a config service. Secrets come from a secrets manager (Vault, AWS Secrets Manager), not plain config.

Dynamic config (change without redeploying): a config service or etcd/Consul key-value store that services watch, or a feature-flag platform (LaunchDarkly, Unleash, homegrown). Rules: validate config before applying, roll changes out gradually (a bad config change is a deploy), keep history and audit who changed what, and have services fall back to last-known-good config if the config store is unavailable.

Many large outages come from config pushes; mention staged rollout and automatic rollback for config just like code.

## Interview questions

- How does service A find healthy instances of service B?
- API gateway vs service mesh: what goes where?
