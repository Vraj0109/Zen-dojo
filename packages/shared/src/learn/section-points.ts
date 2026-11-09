// Where each "Go deeper" section sits relative to the concept's checklist (plan 0023, step 2).
// Key: concept id, then section title. Value: 0-based index of the checklist point (study.ts) the section is about;
// a fraction (0.5) places it between points. Sections without an entry come after all of them, in file order.
// Only the TypeScript lessons that remain (LLD, agent D's) need this; Markdown lessons carry {point: n} themselves.
// The merge in index.ts sorts by this value (stable), so file order breaks ties.

export const SECTION_POINTS: Record<string, Record<string, number>> = {
  "lld-oop": {
    "Inheritance gone wrong, composition instead": 1,
    "Encapsulation that protects invariants": 0,
    "Abstraction, interfaces and abstract classes": 3,
    "Polymorphism: overloading vs overriding": 2,
  },
  "lld-solid": {
    "Open/closed + dependency inversion in one example": 1,
    "Liskov and interface segregation, concretely": 2,
    "Single responsibility in practice": 0,
    "Dependency injection without a framework": 4,
  },
  "lld-patterns": {
    "State pattern for a vending machine": 6,
    "Creational patterns: Factory, Builder, Singleton": 2,
    "Behavioural patterns: Strategy, Observer, Command, Chain of Responsibility": 0,
    "Structural patterns: Decorator, Adapter, Facade, Composite, Proxy": 5,
  },
  "lld-modeling": {
    "A state machine with an explicit transition table": 2,
    "Relationships and ownership": 0.5,
    "From requirements to classes in 10 minutes": 0,
    "Validation and error handling": 3,
    "Designing for extension": 4,
  },
  "lld-concurrency": {
    "Thread-safe slot allocation": 1,
    "Producer-consumer and thread pools": 2,
    "Java concurrency toolbox": 0.5,
    "A thread-safe LRU cache, two ways": 6,
    "Common concurrency bugs to name": 4,
  },
  "lld-testing": {
    "Testing a rate limiter with an injected clock": 0.5,
    "Designing tests for an LLD solution": 0,
    "Mocks, fakes and stubs": 2,
    "Integration and contract tests": 3,
  },
};
