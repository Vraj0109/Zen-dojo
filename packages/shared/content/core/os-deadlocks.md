---
id: os-deadlocks
title: Deadlocks
area: core
section: Operating systems
---

## Overview

A deadlock is a set of threads each waiting for a resource held by another, so none progress. It needs all four Coffman conditions at once; break any one of them to prevent it.

## What to know

1. The four Coffman conditions :: Mutual exclusion (the resource can't be shared), hold and wait (holding one resource while waiting for another), no preemption (resources can't be taken away), and circular wait (a cycle of waiting). All four must hold for a deadlock.

2. Prevention (lock ordering, timeouts) :: Break circular wait with a global lock order (always lock account A before account B, e.g. by id), the most practical fix. Break hold-and-wait by acquiring all locks at once. Use tryLock with a timeout and back off, which breaks the wait at the cost of retries.

3. Avoidance (Banker's algorithm idea) :: Banker's algorithm: grant a request only if the system stays in a 'safe state' where every process can still finish with the remaining resources. Needs maximum demands in advance, so it's rarely used in practice; know the idea.

4. Detection and recovery :: Detection builds a wait-for graph and looks for cycles (databases do this), then recovers by aborting a victim and rolling back. This is common when deadlocks are rare and the abort cost is acceptable.

5. Livelock and starvation :: Livelock: threads keep reacting to each other and changing state without progress (two people stepping aside in a corridor); fixed with randomized backoff. Starvation: one thread never gets the resource while others do; fixed with fair locks or aging.

## Recap

- Coffman: mutual exclusion, hold and wait, no preemption, circular wait (all four needed).
- Prevention in practice: acquire locks in one global order; or tryLock with timeout and back off.
- Avoidance (Banker's): only grant requests that keep the system in a safe state.
- Livelock: threads keep reacting and make no progress; add randomized backoff.

## Go deeper

### The four conditions with examples {point: 0}

Mutual exclusion: a resource can be held by only one thread at a time (a lock, a printer). Hold and wait: a thread holds one resource while waiting for another. No preemption: resources can't be forcibly taken away; the holder must release them. Circular wait: a cycle of threads each waiting for a resource held by the next.

All four are needed for deadlock, so preventing any one prevents deadlock. Break mutual exclusion: use lock-free structures or immutable data (not always possible). Break hold and wait: acquire all resources at once (or none), e.g. tryLock on both and back off if either fails. Break no preemption: let the system take resources away (databases abort a transaction and release its locks). Break circular wait: impose a global order on resources and always acquire in that order; the most practical technique.

Resource allocation graphs visualize this: with single-instance resources, a cycle means deadlock; with multi-instance resources, a cycle is necessary but not sufficient.

### The bank transfer deadlock and the fix {point: 1}

transfer(a, b) locks a then b; transfer(b, a) concurrently locks b then a. Each holds one lock and waits for the other: circular wait. Fix: always lock the account with the smaller id first, regardless of direction. Then every thread acquires locks in the same order and a cycle can't form.

```
void transfer(Account from, Account to, long amount) {
    Account first = from.id() < to.id() ? from : to;
    Account second = first == from ? to : from;
    synchronized (first) {
        synchronized (second) {
            from.withdraw(amount);
            to.deposit(amount);
        }
    }
}
```

### Detection and the Banker's idea {point: 2}

Detection: build a wait-for graph (thread → thread it waits on) and look for a cycle; databases do this and abort one transaction (the victim). Recovery: kill/rollback a participant or preempt a resource.

Banker's algorithm: each process declares its maximum need; a request is granted only if, afterwards, there's still some order in which every process can finish with the available resources. Rarely used in practice because maximum needs are unknown, but interviewers like the 'safe state' concept.

### Banker's algorithm walkthrough {point: 2}

Each process declares its maximum need for each resource type. The system tracks Available, Allocation and Need (= Max − Allocation). A state is safe if there's an order in which every process can obtain its remaining need from what's available plus what earlier processes release when they finish.

Example with one resource type, 12 units total: P0 has 5, max 10 (needs 5); P1 has 2, max 4 (needs 2); P2 has 2, max 9 (needs 7). Available = 12 − 9 = 3. Safe sequence: P1 (needs 2 ≤ 3; finishes, available 5), then P0 (needs 5 ≤ 5; finishes, available 10), then P2 (needs 7 ≤ 10). Safe. If P2 now asks for 1 more, pretend to grant: available 2, P2 needs 6. P1 can finish (available 4), then neither P0 (needs 5) nor P2 (needs 6) can: unsafe, so the request must wait.

Real operating systems don't use this (maximum needs are unknown, processes come and go), but databases and some embedded systems use avoidance-style reasoning.

### Deadlocks in real systems {point: 4}

Application code: nested synchronized blocks in inconsistent orders; calling out to unknown code (listeners, callbacks) while holding a lock; a thread pool whose tasks wait on other tasks queued in the same full pool (thread starvation deadlock). Fixes: lock ordering, never hold locks while calling foreign code, separate pools for dependent tasks, timeouts with tryLock.

Databases: two transactions updating the same rows in opposite orders; foreign-key checks and gap locks adding unexpected locks. Databases detect cycles and abort one transaction with a deadlock error; applications must retry. Distributed systems: services waiting on each other synchronously (A calls B which calls A) can exhaust threads; use timeouts and avoid cycles in synchronous call graphs.

Diagnosis: thread dumps (jstack) show threads BLOCKED on monitors with 'Found one Java-level deadlock'; database deadlock logs show the two statements involved.

## Interview questions

- Two threads transfer money between the same two accounts in opposite directions. How do you avoid deadlock?
- Deadlock vs livelock vs starvation?
