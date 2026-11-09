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

### Inject the clock and the other edges, then fake them

Most hard-to-test code is hard to test because it reaches out for something it should have been given: the current time, a random number, a payment provider, a file. The fix is the same each time. Define a small interface for what the class needs (TimeSource with nowMillis, PaymentGateway with charge and refund, Dice with roll), pass an implementation in through the constructor, and use a fake in tests.

The clock is the most valuable one. Code that calls System.currentTimeMillis cannot be tested for expiry, timeouts, refund windows or daily limits without sleeping, and sleeping makes tests slow and flaky. With an injected clock, a test creates a ManualClock, calls advance(60_000), and the next line asserts the result. Every project in this section does it: holds expire, offers time out, fines grow, leases lapse, and none of the tests waits.

Fakes beat mocks for these edges. A FakePayments class that can be told to decline and that records its calls is a few lines, reads like a specification, and does not break when the implementation is refactored. A mocking library that checks which methods were called in which order ties the test to the implementation.

Write the fake so that it can misbehave on demand: decline the next charge, jam the next dispense, fail the next send. The tests worth writing are the ones for failure, and the failure paths are where most designs are wrong. A hook that runs in the middle of a call (the payment provider advancing the clock while a charge is in flight) lets you test an interleaving without any threads.

Name what you do not fake: the classes under test and their close collaborators run for real. Only the edges are replaced.

```
interface TimeSource { long nowMillis(); }

final class ManualClock implements TimeSource {
    private long now;
    ManualClock(long start) { now = start; }
    public synchronized long nowMillis() { return now; }
    synchronized void advance(long millis) { now += millis; }
}

final class FakePayments implements PaymentGateway {
    private boolean decline;
    synchronized void declineNext(boolean value) { decline = value; }
    public synchronized String charge(String user, int cents, String key) { return decline ? null : "pay-1"; }
    public synchronized void refund(String ref, int cents) { refunds.add(ref + ":" + cents); }
}
```

### In-memory repositories and testing through the public API

A class that talks to a database is tested with an in-memory version of the same interface. A Repository interface with find, save and putIfAbsent has two implementations: the real one (SQL, a key-value store) and an in-memory one backed by a ConcurrentHashMap. The tests use the in-memory one, run in microseconds, and still exercise all the logic of the class that uses it. A small number of integration tests then check that the real implementation behaves like the in-memory one.

Keep the interface honest. If the real database can fail, or return nothing, or refuse a duplicate key, the interface must say so (an Optional, a boolean from putIfAbsent), so that the in-memory version and the tests can produce those cases.

Test through the public API of the class, the way a caller would, and not through its private helpers. Book a seat, pay, cancel, and assert what a user could see. When the behaviour is right, you are free to refactor the inside. When you feel the need to test a private method, it often wants to be its own small class with its own tests: ChangeMaker, Allocator and DebtSimplifier were extracted this way, and each is tested directly with the cases that are hard to reach from the outside (30 cents from one quarter and three dimes).

Name tests as sentences that state the rule: a refused stay leaves no night counted, a declined card returns the booking to held, an answer at the deadline is too late. A failing test then tells you which rule broke.

Table of what to cover for each class: the normal path; each refusal code; each boundary (one before, exactly at, one after); idempotency (doing it twice); and the invariant after a failure (nothing was changed).

```
interface UrlRepository {
    boolean putIfAbsent(ShortLink link);          // false when the code is taken
    Optional<ShortLink> find(String code);
    void delete(String code);
}

final class InMemoryUrlRepository implements UrlRepository {
    private final ConcurrentHashMap<String, ShortLink> links = new ConcurrentHashMap<>();
    public boolean putIfAbsent(ShortLink link) { return links.putIfAbsent(link.code(), link) == null; }
    public Optional<ShortLink> find(String code) { return Optional.ofNullable(links.get(code)); }
    public void delete(String code) { links.remove(code); }
}
```

### Properties, invariants and seeded randomness

Examples test the cases you thought of. Properties test the ones you did not. A property is a statement that must hold for any input, and a test generates many inputs and checks it. With a seeded Random the inputs are the same on every run, so a failure can be reproduced.

Good properties for the LLD problems. The parts of a split always add up to the total, for 2000 random totals and weights (expense sharing), and nobody is more than one cent from their exact share. A fast check agrees with a slow, obviously right one: the two-neighbour overlap check against comparing with every booking, the grid index against checking every driver, chess move generation against the published perft numbers (20, 400, 8902). Round trips: recovering a store from its log gives the same content. Conservation: after random transfers between accounts the total is unchanged. Ordering: the optimal debt simplification is never longer than the greedy one. No-overlap: after a mixed workload no room has two meetings at the same time.

The pattern is always the same: build a reference that is too slow or too simple to ship but easy to trust, generate inputs, and compare. The reference is often a plain loop.

Seeds matter. Print the seed when a test fails, or use a fixed one, because a random test that fails once and never again is worse than no test. Keep generated sizes small enough to finish in a second or two.

Finally, invariants are not only for tests. A method such as netBalances can assert that the sum is zero in a debug build, and a reconciliation job in production can check the same property over real data. Writing the invariant down is the design activity, and the test is a by-product.

```
Random random = new Random(42);                      // fixed seed: failures repeat
for (int round = 0; round < 2000; round++) {
    long total = random.nextInt(1_000_000);
    Map<String, Long> weights = randomWeights(random);
    Map<String, Long> parts = Allocator.allocate(total, weights);
    assertEquals(total, sum(parts));                 // property: parts add up to the total
    for (String id : parts.keySet()) {
        double ideal = (double) total * weights.get(id) / sumOf(weights);
        assertTrue(Math.abs(parts.get(id) - ideal) < 1.0);   // property: within one cent
    }
}
```

## Interview questions

- How would you test fee calculation that depends on the current time?
- What would you mock in your design and why?
