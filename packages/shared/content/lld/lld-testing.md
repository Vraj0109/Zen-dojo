---
id: lld-testing
title: Testing mindset
area: lld
section: Topics
---

## Overview

Mentioning how you'd test your design shows seniority. Keep it short: what you'd unit test, the edge cases, and how dependency injection makes it testable.

## What to know

1. Unit tests for the class you wrote :: Test behaviour through public methods: park assigns the smallest fitting spot, unpark frees it and computes the fee. One behaviour per test, arrange-act-assert, descriptive names (parksBikeInSmallestAvailableSpot).

2. Edge cases :: Empty and full states (no spots left), boundary values (exactly at the fee boundary), invalid input (negative amount, unknown ticket), duplicates (paying twice), and concurrency (two cars racing for the last spot).

3. Mocks :: Replace dependencies (payment gateway, clock, notification sender) with fakes or mocks so tests are fast and deterministic. That's only possible if the dependencies are injected interfaces, which ties back to dependency inversion. Inject a Clock for any time-based logic.

4. What you'd test in integration :: Integration tests check real wiring: repository against a real database (Testcontainers), API endpoints end to end, message flow through a queue. Fewer of them, covering the paths that unit tests with fakes can't prove.

## Recap

- Test behaviour through the public API: happy path, boundaries, invalid input, state transitions.
- Mock only what you don't own or what's slow (clock, payment gateway, random).
- Inject Clock and Random so time and randomness are testable.
- Integration tests for wiring: DB queries, serialization, concurrency under load.

## Go deeper

### Designing tests for an LLD solution {point: 0}

Organize tests by behaviour, with names that read as specifications: parks_vehicle_in_nearest_free_slot, rejects_when_no_slot_of_matching_type, charges_minimum_one_hour, releases_slot_on_exit. Use arrange-act-assert structure. Cover: the main happy path; boundary values (exactly at capacity, zero items, the first and last hour); invalid input (null, negative, unknown ids); state machine transitions, both allowed and forbidden; and concurrency (many threads competing for the last resource).

Table-driven tests for rules: a list of (input, expected) cases run through one test, which is perfect for pricing and validation. Keep tests deterministic: inject the clock, random source and ids.

```
@ParameterizedTest
@CsvSource({
    "0,   60",     // minutes parked, expected fee: first hour minimum
    "59,  60",
    "61,  120",
    "1440, 1200"   // daily cap
})
void hourly_pricing(int minutes, int expectedCents) {
    PricingStrategy p = new HourlyPricing(60, 1200);
    assertEquals(expectedCents, p.fee(Duration.ofMinutes(minutes)));
}
```

### Testing a rate limiter with an injected clock {point: 0.5}

A limiter that calls System.currentTimeMillis() can only be tested with sleeps. Inject a Clock (or a LongSupplier) and advance it in the test. Cover: allows up to the limit, rejects the next, refills after time passes, separate keys are independent, concurrent callers never exceed the limit (run N threads and count allowed).

```
class FakeClock implements LongSupplier { long now; public long getAsLong() { return now; } }

@Test void refillsAfterOneSecond() {
    FakeClock clock = new FakeClock();
    TokenBucket b = new TokenBucket(2, 2.0, clock);   // capacity 2, 2 tokens/s
    assertTrue(b.tryAcquire()); assertTrue(b.tryAcquire());
    assertFalse(b.tryAcquire());
    clock.now += 500;                                 // half a second → 1 token
    assertTrue(b.tryAcquire());
    assertFalse(b.tryAcquire());
}
```

### Mocks, fakes and stubs {point: 2}

A stub returns canned answers (a PaymentGateway that always approves). A fake is a working lightweight implementation (an in-memory repository backed by a HashMap). A mock records interactions so you can verify calls (verify(notifier).send("user@x", any())). Spy wraps a real object.

Prefer fakes for repositories and stores (tests read naturally and don't break on refactors), stubs for external services, and mocks only when the interaction itself is the behaviour (we must notify the customer exactly once). Over-mocking couples tests to implementation details: if a refactor that keeps behaviour breaks tests, they're testing the wrong thing.

Test the concurrency claim directly: start N threads with a CountDownLatch to release them together, have each try to book the last seat, and assert exactly one succeeded.

```
@Test
void only_one_thread_gets_the_last_slot() throws Exception {
    ParkingLot lot = lotWithFreeSlots(1);
    int threads = 32;
    CountDownLatch start = new CountDownLatch(1);
    ExecutorService pool = Executors.newFixedThreadPool(threads);
    List<Future<Optional<Ticket>>> results = new ArrayList<>();
    for (int i = 0; i < threads; i++)
        results.add(pool.submit(() -> { start.await(); return lot.park(new Car("KA-" + UUID.randomUUID())); }));
    start.countDown();
    long parked = 0;
    for (var f : results) if (f.get().isPresent()) parked++;
    assertEquals(1, parked);
}
```

### Integration and contract tests {point: 3}

Unit tests check classes; integration tests check the wiring: real database queries (Testcontainers spins up Postgres in Docker), serialization of API requests and responses, message formats on queues, and transaction boundaries (does a failure roll back both writes?). Contract tests (Pact) verify that a provider still satisfies what its consumers expect, catching breaking API changes between services.

End-to-end tests cover a few critical journeys through the real system; they're slow and flaky if overused, so keep the pyramid: many unit tests, fewer integration tests, very few end-to-end tests.

In an interview wrap-up, one sentence per level is enough: 'Unit tests for pricing and allocation with a fake clock; an integration test for the repository with Testcontainers; a concurrency test for slot allocation.'

### What to say about tests in an LLD round

List 4-6 named cases for your design: 'park when full returns empty', 'exit computes fee across midnight', 'two threads can't take the same slot', 'unknown ticket throws'. Mention that strategies (pricing, matching) are unit-tested in isolation with table-driven cases, and that the facade gets a few end-to-end tests.

That shows the design is testable, which is usually the real point of the question.

## Interview questions

- How would you test fee calculation that depends on the current time?
- What would you mock in your design and why?
