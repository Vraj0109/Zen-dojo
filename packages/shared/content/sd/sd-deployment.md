---
id: sd-deployment
title: Deployment
area: sd
section: C. Building blocks
---

## Overview

How code reaches production decides how safely you can change it. Interviewers like hearing about gradual rollouts, fast rollback and surviving the loss of a zone or region.

## What to know

1. Containers and Kubernetes basics :: Containers package an app with its dependencies so it runs the same everywhere. Kubernetes schedules containers (pods) onto machines, keeps the desired number running, does rolling updates, service discovery and autoscaling. Know the vocabulary: pod, deployment, service, ingress.

2. Blue-green and canary :: Blue-green: run the new version alongside the old one and switch traffic at once, with instant rollback by switching back (needs double capacity). Canary: send a small percentage of traffic to the new version, compare its metrics, then ramp up. Canary catches problems with limited blast radius.

3. Feature flags and rollbacks :: Feature flags separate deploying code from releasing a feature: ship dark, enable for internal users, then a percentage, with a kill switch. Rollback should be one click. Database migrations must be backward compatible (expand, migrate, then contract) so old and new code can run together.

4. Infrastructure as code :: Define infrastructure in code (Terraform, CloudFormation) so environments are reproducible, reviewed and versioned, rather than configured by hand.

5. Multi-region and multi-AZ design :: Spread every tier across at least 3 availability zones (independent data centers in a region) to survive a zone outage. Multi-region adds disaster recovery and lower latency for global users, but brings cross-region replication lag and write-conflict problems. Choose active-passive or active-active, and know your RPO and RTO.

## Recap

- Rolling: replace instances gradually. Blue-green: switch traffic between two stacks. Canary: 1% → 10% → 100% with automatic rollback on metrics.
- Feature flags decouple deploy from release; clean them up.
- Schema changes: expand → migrate → contract, so old and new code both work.
- Multi-AZ by default; multi-region for disaster recovery or latency (active-passive vs active-active).

## Go deeper

### Containers and Kubernetes basics {point: 0}

A container image packages the app with its dependencies; containers run as isolated processes sharing the host kernel (namespaces and cgroups). Kubernetes runs them across a cluster: a Pod is one or more containers scheduled together; a Deployment keeps N replicas of a pod spec running and performs rolling updates; a Service gives pods a stable name and load balancing; an Ingress or Gateway routes external HTTP traffic in; ConfigMaps and Secrets inject configuration; StatefulSets give stable identities and volumes for stateful workloads; HPA scales replicas on metrics.

Probes: liveness (restart if stuck), readiness (receive traffic only when ready), startup (give slow starters time). Resource requests (for scheduling) and limits (caps; exceeding the memory limit kills the container) prevent noisy neighbours. Pod disruption budgets keep enough replicas up during node maintenance.

You don't need deep Kubernetes in system design interviews, but knowing these words lets you explain how services are deployed, scaled and healed.

### Release strategies in depth {point: 1}

Rolling update: replace instances in batches; cheap, but old and new versions run side by side, so changes must be backward compatible (APIs, database schema, message formats). Blue-green: deploy the new version as a full parallel environment, test it, switch traffic at the load balancer; instant rollback by switching back; doubles capacity during the switch; databases are shared so schema compatibility still matters.

Canary: send a small percentage of traffic (1%, then 5%, 25%, 100%) to the new version and compare error rate, latency and business metrics against the baseline automatically; roll back on regression (Argo Rollouts, Flagger, Spinnaker). Feature flags: deploy code dark and enable features per user, cohort or percentage; separates deploy from release, enables quick kill switches and experiments, but stale flags become debt.

Shadow traffic: mirror real requests to the new version without returning its responses, to test performance and correctness safely (watch out for side effects).

### Zero-downtime schema change {point: 1.5}

Rename column name → full_name. Expand: add full_name (nullable); deploy code that writes both and reads name. Backfill full_name in batches. Switch reads to full_name. Contract: stop writing name, then drop it in a later release.

Each step is backward compatible with the previous code version, so rolling deploys and rollbacks are safe. Big-table changes use online tools (gh-ost, pg_repack) or batched updates to avoid long locks.

### Infrastructure as code and environments {point: 3}

Define infrastructure (networks, databases, queues, IAM, DNS) in code (Terraform, Pulumi, CloudFormation, CDK), reviewed and versioned like application code, applied by CI/CD with plan previews. Benefits: reproducible environments, drift detection, audit history, easy creation of staging or new regions.

Environments: development, staging (production-like, smaller), production; promote the same artifact through them. Use separate accounts or projects per environment to limit blast radius. Database migrations run as a deploy step, backward compatible (expand → migrate → contract), with backups and a rollback plan.

Multi-AZ by default for high availability; multi-region when requirements demand (latency for global users, regional disaster recovery, data residency laws); state RTO/RPO and test failover regularly.

### Multi-region choices {point: 4}

Active-passive: one region serves, the other has replicated data and scaled-down capacity; failover takes minutes (RTO) and may lose seconds of async writes (RPO). Simpler and cheaper.

Active-active: every region serves users near it. Reads are easy; writes need either a home region per user (route writes there) or multi-leader replication with conflict handling, or a globally consistent database (Spanner) with higher write latency. State your RTO/RPO and choose.

## Interview questions

- How would you roll out a risky change to the payment service?
- Design for surviving the loss of an entire region.
