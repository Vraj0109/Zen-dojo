---
id: lld-oop
title: OOP principles
area: lld
section: Topics
---

## Overview

Object-oriented design is about putting behaviour next to the data it protects and depending on abstractions. In an LLD round, interviewers judge whether your classes have clear responsibilities and whether the design bends easily when requirements change.

## What to know

1. Encapsulation :: Keep fields private and expose behaviour, not setters: account.withdraw(amount) checks the balance itself instead of callers doing setBalance(getBalance() - x). This keeps invariants in one place.

2. Inheritance vs composition :: Inheritance models 'is-a' and couples the subclass to the parent's internals; deep hierarchies get brittle. Composition ('has-a', delegating to a field) is more flexible: a Car has an Engine you can swap. Prefer composition, and use inheritance for true subtypes with shared behaviour.

3. Polymorphism :: Callers work with an interface (PaymentMethod) and each implementation (Card, UPI, Wallet) behaves differently behind it. This removes if/else-on-type chains, and new types are added without touching callers.

4. Interfaces and abstract classes :: An interface is a pure contract with no state; a class can implement many, and it's the default for abstractions. An abstract class can hold shared state and partial implementation for closely related subclasses (template method). Program to interfaces.

## Recap

- Encapsulation: private state, public behaviour; validate in one place.
- Prefer composition (has-a) over inheritance (is-a) unless substitution truly holds.
- Polymorphism: call through an interface; add a class instead of an if/else branch.
- Interface = capability contract; abstract class = shared partial implementation.

## Go deeper

### Encapsulation that protects invariants {point: 0}

A BankAccount with a public balance field lets any caller make it negative. Make balance private and expose withdraw(amount) that checks the rule in one place; there's no setter. Return unmodifiable views of internal collections so callers can't add items behind your back.

In interviews, when you draw a class, say which invariant each method protects ('a slot can be occupied by at most one vehicle').

### Inheritance gone wrong, composition instead {point: 1}

Classic trap: class Bird { fly() }, class Penguin extends Bird → Penguin.fly() throws. The hierarchy encoded a capability that not every subtype has. Composition models capabilities as parts: a Bird has a MovementStrategy (Flying, Swimming, Walking). New combinations need no new subclasses, and behaviour can change at runtime.

Use inheritance for true 'is-a' with shared invariants (ArrayList is a List), and keep hierarchies shallow.

```
interface Movement { void move(); }
class Flying implements Movement { public void move() { System.out.println("flap"); } }
class Swimming implements Movement { public void move() { System.out.println("paddle"); } }

class Bird {
    private final String name;
    private final Movement movement;          // has-a, swappable
    Bird(String name, Movement movement) { this.name = name; this.movement = movement; }
    void travel() { movement.move(); }
}
// new Bird("penguin", new Swimming()); new Bird("eagle", new Flying());
```

### Polymorphism: overloading vs overriding {point: 2}

Compile-time polymorphism (overloading): same method name with different parameter lists in one class (print(int), print(String)); the compiler picks based on static types. Runtime polymorphism (overriding): a subclass provides its own implementation of an inherited method; the JVM picks based on the object's actual class (dynamic dispatch). Overriding is what lets you replace conditionals with objects.

Overriding rules: same signature, return type the same or a subtype (covariant), can't reduce visibility, can't throw broader checked exceptions; use @Override so the compiler catches mistakes. static methods are hidden, not overridden; private methods aren't inherited. Fields aren't polymorphic.

equals and hashCode: if two objects are equal, their hash codes must match, or HashMap/HashSet break. Override both together for value objects (Money, Point, Coordinate), and keep them consistent with the fields that define identity. Prefer immutable value objects (Java records give equals/hashCode/toString for free).

```
record Money(long cents, String currency) {
    Money {
        if (cents < 0) throw new IllegalArgumentException("negative amount");
        Objects.requireNonNull(currency);
    }
    Money plus(Money other) {
        if (!currency.equals(other.currency)) throw new IllegalArgumentException("currency mismatch");
        return new Money(cents + other.cents, currency);
    }
}
// records: immutable, equals/hashCode/toString generated from the fields
```

### Abstraction, interfaces and abstract classes {point: 3}

Abstraction means exposing what an object does and hiding how. In Java, an interface declares a capability (Comparable, Runnable, PaymentMethod) with no state; a class can implement many. Since Java 8, interfaces can have default methods for shared behaviour, but still no instance fields. An abstract class can hold state and constructors and partially implement behaviour, but a class extends only one.

Rule of thumb: use an interface for a role that unrelated classes may play (Notifier implemented by EmailNotifier, SmsNotifier). Use an abstract class when subclasses share real state and a template of steps (an AbstractReportGenerator with generate() calling abstract fetchData() and format(): the template method pattern). Program to interfaces in fields and parameters (List<Order> rather than ArrayList<Order>) so implementations can change.

In interviews, define the interfaces first for the parts that will vary (pricing, matching, notification channels), then write concrete classes.

```
abstract class Report {
    // Template method: fixed order of steps, details left to subclasses
    public final String generate() {
        List<Row> rows = fetch();
        return header() + format(rows);
    }
    protected abstract List<Row> fetch();
    protected abstract String format(List<Row> rows);
    protected String header() { return "Report generated at " + Instant.now() + "\n"; }
}

class SalesReport extends Report {
    protected List<Row> fetch() { return salesRepo.lastMonth(); }
    protected String format(List<Row> rows) { return Csv.of(rows); }
}
```

### Cohesion, coupling and good class boundaries

High cohesion: everything in a class serves one purpose (a Ticket knows its entry time, vehicle and slot, and how long it has been open). Low coupling: classes depend on few others, through narrow interfaces, so changes stay local.

Smells in interview code: a God class (ParkingLotManager doing allocation, pricing, payments and printing), anemic models (classes with only getters/setters while all logic lives in a service), feature envy (a method mostly using another object's data, which suggests it belongs there), long parameter lists (introduce a parameter object), and primitive obsession (passing raw strings and ints for money, ids, statuses instead of types and enums).

Law of Demeter: talk to your direct collaborators, not their internals (lot.getFloor(2).getSlots().get(5).park(car) leaks structure; prefer lot.park(car) delegating down). Following these keeps the class diagram you draw in an interview clean and easy to extend.

## Interview questions

- Composition vs inheritance: give a case where inheritance goes wrong.
- Interface vs abstract class in Java?
