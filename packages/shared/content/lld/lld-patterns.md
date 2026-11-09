---
id: lld-patterns
title: Design patterns
area: lld
section: Topics
---

## Overview

Patterns are named solutions to recurring design problems. Use them when the problem calls for them, name them as you use them, and know the one-line intent of each common one.

## What to know

1. Strategy :: Define a family of interchangeable algorithms behind one interface and choose at runtime: pricing strategies, payment methods, elevator scheduling, rate-limit algorithms. It replaces conditionals on type.

2. Observer :: Subjects notify registered observers when something changes, so publishers don't know the concrete subscribers: notify display boards when a parking spot frees up, or send notifications on order status changes. Watch out for memory leaks from forgotten subscriptions, and for ordering.

3. Factory and Abstract Factory :: A factory centralizes object creation behind a method (VehicleFactory.create(type)), so callers don't call new on concrete classes. An abstract factory creates families of related objects (a UI toolkit's Button and Checkbox for Mac vs Windows).

4. Builder :: Build complex objects step by step with readable, optional parameters instead of telescoping constructors: new Pizza.Builder().size(L).cheese().build(). Validate in build(). Good for immutable objects with many fields.

5. Singleton (and its pitfalls) :: Ensures one instance with a global access point (configuration, a connection pool). Pitfalls: hidden global state, hard to test (can't swap it for a fake), and thread-safety of lazy creation. Prefer dependency injection; if you need one, use an enum or a holder class for thread-safe laziness.

6. Decorator :: Wrap an object to add behaviour while keeping the same interface, stacking at runtime: new BufferedInputStream(new FileInputStream(f)), or a coffee with milk and sugar decorators, or logging and caching wrappers around a repository.

7. State :: An object changes behaviour when its internal state changes, with each state as a class: a vending machine (Idle → HasMoney → Dispensing), an order lifecycle, a TCP connection. It replaces big switch statements on a state enum and makes illegal transitions explicit.

8. Command :: Encapsulate a request as an object so it can be queued, logged, retried or undone: text editor undo and redo, a job queue, elevator requests, transaction operations.

9. Adapter :: Convert one interface to another that clients expect, wrapping a legacy or third-party API: a PaymentGateway adapter around the Stripe SDK, or an XML-to-JSON adapter.

10. Chain of Responsibility :: Pass a request along a chain of handlers until one handles it: middleware (auth → rate limit → logging → handler), approval workflows (manager → director → VP), ATM cash dispensing (2000s → 500s → 100s), logging levels.

## Recap

- Strategy: swap an algorithm (pricing, matching). State: behaviour depends on a state object.
- Observer: notify subscribers of events. Command: an action as an object (undo, queue).
- Factory: hide which class to create. Builder: many optional parameters, immutable result.
- Decorator: add behaviour by wrapping. Adapter: convert one interface to another.

## Go deeper

### Behavioural patterns: Strategy, Observer, Command, Chain of Responsibility {point: 0}

Strategy: a family of interchangeable algorithms behind one interface, chosen at runtime (pricing by hour vs flat, matching nearest vs best-rated). Observer: subjects publish events and observers subscribe (order shipped → notify customer, update analytics), decoupling the source from reactions; in distributed systems this becomes pub/sub. Command: encapsulate a request as an object with execute() (and undo()), enabling queues, logging, retries and undo stacks (text editors, smart home actions). Chain of Responsibility: pass a request along a chain of handlers until one handles it (logging levels, approval workflows by amount, middleware: auth → rate limit → validation → handler).

State (covered with the vending machine) and Template Method (covered with reports) complete the set interviewers expect.

```
interface Approver { void setNext(Approver next); void approve(Expense e); }
abstract class BaseApprover implements Approver {
    private Approver next;
    public void setNext(Approver next) { this.next = next; }
    protected void passOn(Expense e) {
        if (next == null) throw new IllegalStateException("No one can approve " + e.amount());
        next.approve(e);
    }
}
class Manager extends BaseApprover {
    public void approve(Expense e) { if (e.amount() <= 1_000) System.out.println("Manager approved"); else passOn(e); }
}
class Director extends BaseApprover {
    public void approve(Expense e) { if (e.amount() <= 10_000) System.out.println("Director approved"); else passOn(e); }
}
// manager.setNext(director); director.setNext(cfo); manager.approve(new Expense(5_000));
```

### Creational patterns: Factory, Builder, Singleton {point: 2}

Factory method / simple factory: centralize object creation when the concrete class depends on input (VehicleFactory.create(type) returns Car, Bike or Truck). Callers depend on the interface, and adding a type changes one place. Abstract factory: create families of related objects that must match (a UI theme factory producing a matching Button and Checkbox).

Builder: construct complex objects step by step with readable, optional parameters, producing an immutable result and validating at build(). Ideal for objects with many optional fields (an HTTP request, a search query, a pizza order).

Singleton: exactly one instance (a configuration registry, a connection pool manager). Implement safely with an enum or the holder idiom. Pitfalls: hidden global state, hard to test (can't swap it), and lifecycle problems; prefer creating one instance in the composition root and injecting it.

```
class SearchQuery {
    private final String text; private final int limit; private final List<String> filters;
    private SearchQuery(Builder b) { text = b.text; limit = b.limit; filters = List.copyOf(b.filters); }
    static Builder builder(String text) { return new Builder(text); }
    static class Builder {
        private final String text; private int limit = 20; private final List<String> filters = new ArrayList<>();
        Builder(String text) { this.text = text; }
        Builder limit(int n) { if (n <= 0) throw new IllegalArgumentException(); limit = n; return this; }
        Builder filter(String f) { filters.add(f); return this; }
        SearchQuery build() { return new SearchQuery(this); }
    }
}
// SearchQuery q = SearchQuery.builder("shoes").limit(50).filter("brand:nike").build();

enum Config { INSTANCE; private final Properties props = load(); String get(String k) { return props.getProperty(k); } }
```

### Structural patterns: Decorator, Adapter, Facade, Composite, Proxy {point: 5}

Decorator: wrap an object to add behaviour while keeping its interface (a Notifier wrapped by RetryingNotifier and LoggingNotifier; Java I/O streams). Composable and avoids subclass explosion. Adapter: make an existing class fit the interface you need (wrap a third-party SMS SDK to implement your Notifier). Facade: a simple entry point over a complex subsystem (ParkingLotSystem.park(vehicle) hiding floors, allocation and tickets), often the class your LLD answer exposes to the 'client'. Composite: treat individual objects and groups uniformly (files and directories in a file system, both FileSystemNode with size()). Proxy: a stand-in controlling access (lazy loading, caching, access checks, remote calls).

```
interface Notifier { void send(String to, String msg); }
class SmsNotifier implements Notifier { public void send(String to, String msg) { /* provider call */ } }

class RetryingNotifier implements Notifier {          // Decorator
    private final Notifier inner; private final int attempts;
    RetryingNotifier(Notifier inner, int attempts) { this.inner = inner; this.attempts = attempts; }
    public void send(String to, String msg) {
        for (int i = 1; ; i++) {
            try { inner.send(to, msg); return; }
            catch (RuntimeException e) { if (i == attempts) throw e; sleep(100L << i); }
        }
    }
}
// Notifier n = new LoggingNotifier(new RetryingNotifier(new SmsNotifier(), 3));
```

### State pattern for a vending machine {point: 6}

Without it, every method has a switch on state. With it, each state is a class handling the events that make sense and moving the machine to the next state; invalid actions are rejected in one obvious place per state.

```
interface State {
    default void insertCoin(Machine m, int cents) { throw new IllegalStateException("Can't insert now"); }
    default void select(Machine m, String code)  { throw new IllegalStateException("Insert money first"); }
}
class Idle implements State {
    public void insertCoin(Machine m, int c) { m.addCredit(c); m.setState(new HasCredit()); }
}
class HasCredit implements State {
    public void insertCoin(Machine m, int c) { m.addCredit(c); }
    public void select(Machine m, String code) {
        Item item = m.inventory().get(code);
        if (item.price() > m.credit()) throw new IllegalStateException("Not enough credit");
        m.dispense(item);                         // returns change, decrements stock
        m.setState(new Idle());
    }
}
```

### Picking a pattern in an interview

Say the force first, then the pattern: 'pricing rules will change per lot, so pricing is a Strategy'; 'many things must react when an order ships, so Observer/events'; 'the elevator behaves differently when moving vs idle vs maintenance, so State'; 'undo in the editor, so Command with an undo stack'; 'notification channels need retries and logging added uniformly, so Decorators around a Notifier'.

Singleton: mention it for a single shared resource, then mention its costs (global state, hard to test) and prefer injecting one instance.

## Interview questions

- Which patterns would you use in a vending machine?
- What's wrong with Singleton, and what would you do instead?
- Strategy vs State?

## Common mistakes

- Forcing patterns where a simple class would do.
