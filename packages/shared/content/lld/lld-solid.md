---
id: lld-solid
title: SOLID
area: lld
section: Topics
---

## Overview

SOLID is five principles for code that's easy to change. Interviewers want each one with a concrete example, ideally from the design you're drawing, not textbook definitions.

## What to know

1. Single responsibility (with an example) :: A class should have one reason to change. An Invoice that calculates totals, saves to the database and sends emails changes for three reasons; split it into Invoice (totals), InvoiceRepository (persistence) and InvoiceMailer (email).

2. Open/closed (with an example) :: Open for extension, closed for modification: add behaviour by adding code, not by editing working code. Pricing with if (vehicle == CAR) … else if (BIKE) … must be edited for every new type; a PricingStrategy interface with one class per type is extended instead.

3. Liskov substitution (with an example) :: Subtypes must be usable wherever the base type is expected without surprises. The classic violation: Square extends Rectangle, where setting the width also changes the height, which breaks callers. Another: a ReadOnlyList subclass that throws on add(). If a subclass can't honour the parent's contract, it shouldn't be a subclass.

4. Interface segregation (with an example) :: Clients shouldn't depend on methods they don't use. A fat Worker interface with work() and eat() forces Robot to implement eat(). Split it into Workable and Feedable, or small role interfaces such as Printer, Scanner and Fax instead of one MultiFunctionDevice.

5. Dependency inversion (with an example) :: High-level policy depends on abstractions, not concrete details: OrderService takes a PaymentGateway interface in its constructor rather than creating a StripeClient. This enables testing with fakes and swapping providers, and is what dependency injection is for.

## Recap

- S: one reason to change per class. O: extend with new classes, not edits.
- L: subtypes must honour the base contract (no surprise exceptions or stronger preconditions).
- I: small, focused interfaces. D: depend on abstractions, inject them.
- Name a concrete violation and its fix for each letter.

## Go deeper

### Single responsibility in practice {point: 0}

'A class should have one reason to change' means one actor or concern drives its changes. An Invoice class that calculates totals, renders a PDF and emails it changes when tax rules change, when the PDF layout changes, and when the email provider changes: three reasons. Split into Invoice (data + totals), InvoiceRenderer, and InvoiceSender, each testable alone.

Don't over-split: a class with one method per concept isn't the goal. SRP is about grouping things that change together and separating things that change for different reasons. In LLD answers, a good sign is that each class's name describes its single job without 'and'.

```
class Invoice {                      // data + business rules only
    private final List<LineItem> items;
    Money total(TaxPolicy tax) { /* sum items, apply tax */ }
}
class InvoicePdfRenderer {           // presentation
    byte[] render(Invoice invoice) { /* layout */ }
}
class InvoiceMailer {                // delivery
    private final EmailClient email;
    void send(Invoice invoice, byte[] pdf, String to) { email.send(to, "Your invoice", pdf); }
}
```

### Open/closed + dependency inversion in one example {point: 1}

A checkout that does if (type == CARD) … else if (type == UPI) … must be edited for every new payment method. Extract PaymentMethod with pay(amount); Checkout depends on the interface and receives implementations (constructor injection or a registry). Adding Wallet means adding a class, not touching Checkout (OCP), and Checkout can be unit-tested with a fake (DIP).

```
interface PaymentMethod { Receipt pay(Money amount); }
class CardPayment implements PaymentMethod { public Receipt pay(Money a) { /* gateway call */ return new Receipt(); } }
class UpiPayment implements PaymentMethod { public Receipt pay(Money a) { /* UPI collect */ return new Receipt(); } }

class Checkout {
    private final Map<String, PaymentMethod> methods;     // injected
    Checkout(Map<String, PaymentMethod> methods) { this.methods = methods; }
    Receipt pay(String method, Money amount) {
        PaymentMethod m = methods.get(method);
        if (m == null) throw new IllegalArgumentException("Unsupported: " + method);
        return m.pay(amount);
    }
}
```

### Liskov and interface segregation, concretely {point: 2}

LSP: Square extends Rectangle breaks callers that set width and height independently (setWidth on a square also changes height). The fix is not to inherit; model Shape with area().

ISP: a fat Machine interface with print(), scan(), fax() forces a simple printer to implement fax() by throwing. Split into Printer, Scanner, Fax; a multifunction device implements all three. Throwing UnsupportedOperationException from an interface method is the smell that points to both principles.

### Dependency injection without a framework {point: 4}

Dependency inversion says high-level policy (OrderService) shouldn't depend on low-level details (MySQLOrderRepository, StripeGateway); both depend on abstractions (OrderRepository, PaymentGateway). Dependency injection is the technique: pass dependencies in (usually through the constructor) instead of creating them inside.

Benefits: you can swap implementations (in-memory repository for tests, a new payment provider), dependencies are explicit in the constructor, and objects are easier to reason about. A composition root (main method, or a framework like Spring/Guice) wires concrete classes together in one place.

In an interview, write constructors that take interfaces, and mention that in production a DI container would wire them. Avoid service locators and static singletons for dependencies; they hide what a class needs and make tests painful.

```
interface OrderRepository { void save(Order o); Optional<Order> find(String id); }
interface PaymentGateway { PaymentResult charge(Money amount, String token); }

class OrderService {
    private final OrderRepository orders;
    private final PaymentGateway payments;
    OrderService(OrderRepository orders, PaymentGateway payments) {   // injected
        this.orders = orders; this.payments = payments;
    }
    Order checkout(Cart cart, String cardToken) {
        PaymentResult r = payments.charge(cart.total(), cardToken);
        if (!r.ok()) throw new PaymentFailedException(r.reason());
        Order o = Order.from(cart, r.id());
        orders.save(o);
        return o;
    }
}
// main: new OrderService(new JdbcOrderRepository(ds), new StripeGateway(apiKey));
// test: new OrderService(new InMemoryOrderRepository(), new FakeGateway(true));
```

### When SOLID is overkill, and how to say so

Every abstraction has a cost: more files, indirection, and names to learn. In a 45-minute LLD round, apply SOLID where change is likely or stated by the interviewer (pricing rules, payment methods, notification channels, vehicle types, game rules) and keep the rest concrete.

YAGNI ('you aren't gonna need it') balances OCP: don't add a strategy interface for something with one implementation and no expected variation. A good line: 'Pricing is a strategy because rates differ by lot and time; slot assignment I'll keep as a simple nearest-first method, but it's isolated in one class so we can turn it into a strategy if we need to.' This shows judgment, which interviewers value more than reciting principles.

## Interview questions

- Which SOLID principle does your parking lot pricing follow?
- Give an LSP violation you've seen.
