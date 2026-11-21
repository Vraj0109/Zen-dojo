---
id: c-euler-10
pattern: cses-euler
difficulty: easy
optimal: "O(limit log log limit) time, O(limit) space"
brute: same
reviewed: false
---

## Clarify first

- Is `limit` inclusive or exclusive? (Exclusive: we sum all prime numbers strictly below `limit`).
- What is the maximum value of `limit`? (`limit` can be up to 20,000,000).
- Can the total sum exceed 32-bit signed integers? (Yes, the sum of primes below $2 \times 10^7$ is approximately $1.2 \times 10^{13}$, which exceeds $2^{31} - 1$ and requires a 64-bit integer like `long long` in C++ or `long` in Java).
- What should be returned for small limits like `limit <= 2`? (There are no primes strictly below 2, so the function must return 0).

## Examples to say out loud

- Standard case: `limit = 10`. The primes strictly below 10 are 2, 3, 5, and 7. Their sum is $2 + 3 + 5 + 7 = 17$.
- Small case: `limit = 3`. The only prime strictly below 3 is 2. The output is 2.
- Boundary case: `limit = 2`. The smallest prime is 2, and since the condition is strictly below `limit`, no primes qualify. The output is 0.

## Brute force

A brute-force strategy iterates over every integer $x$ from 2 up to $\text{limit} - 1$, testing whether $x$ is prime using trial division up to $\sqrt{x}$. For $\text{limit} = 2 \times 10^7$, performing trial division across 20 million numbers requires $\sum_{x=2}^{\text{limit}} O(\sqrt{x}) \approx \frac{2}{3} \times (2 \times 10^7)^{1.5} \approx 6 \times 10^{10}$ operations, which takes minutes to run and times out.

## The key observation

The Sieve of Eratosthenes identifies all primes below an upper bound concurrently in nearly linear time. By maintaining a boolean array `composite`, we mark composite multiples of each prime $i$ starting at $i^2$. Because all non-composite numbers remaining unmarked are prime, we can accumulate them directly into a 64-bit running sum in $O(\text{limit} \log \log \text{limit})$ time.

## Optimal approach

1. Check if `limit <= 2`; if so, return 0 immediately.
2. Allocate a byte/boolean array `composite` of size `limit + 1` initialized to 0 (false).
3. Initialize a 64-bit accumulator `total = 0`.
4. Loop `i` from 2 up to `limit - 1`:
   a. If `composite[i]` is non-zero, continue to the next integer.
   b. Otherwise, `i` is prime: add `i` to `total`.
   c. If $i \times i < \text{limit}$, mark all multiples $j = i \times i, i \times i + i, \dots < \text{limit}$ as composite (`composite[j] = 1`).
5. Return `total`.

Complexity:
- Time: `O(limit log log limit)` because the inner sieve loop runs in $\sum_{p < \text{limit}} \frac{\text{limit}}{p} = O(\text{limit} \log \log \text{limit})$ operations, taking about 0.15 seconds for 20 million numbers.
- Space: `O(limit)` auxiliary space to store the boolean or byte composite array of size 20 MB.

## Code walkthrough

In the reference implementation:
- `vector<char> composite(limit + 1, 0);`: creates a compact 1-byte per element array to avoid `vector<bool>` bit-reference performance overhead.
- `long long total = 0;`: uses a 64-bit signed integer to accumulate sums up to $1.2 \times 10^{13}$.
- `for (long long i = 2; i < limit; i++)`: iterates through candidate numbers strictly below `limit`.
- `total += i;`: adds each confirmed prime to the running total.
- `for (long long j = i * i; j < limit; j += i) composite[j] = 1;`: eliminates multiples starting at $i^2$, using 64-bit integers for `j` to prevent overflow when $i > 46,340$.

## Test it out loud

- `limit = 1`:
  - Loop condition `i < 1` is false immediately. Returns 0.
- `limit = 2`:
  - Loop condition `i < 2` is false immediately. Returns 0.
- `limit = 10`:
  - `i = 2`: prime, `total = 2`. Crosses out 4, 6, 8.
  - `i = 3`: prime, `total = 2 + 3 = 5`. Crosses out 9.
  - `i = 4`: composite, skipped.
  - `i = 5`: prime, `total = 5 + 5 = 10`. $5^2 = 25 > 10$, no inner marking.
  - `i = 6`: composite, skipped.
  - `i = 7`: prime, `total = 10 + 7 = 17`.
  - `i = 8, 9`: composites, skipped.
  - Returns 17.

## Follow-ups

- How to reduce memory consumption?
  Store only odd numbers, reducing the array size to `limit / 2` (10 MB). A bitset further compresses this to 1.25 MB, fitting entirely inside CPU L2/L3 cache.
- How to compute the sum for `limit = 10^11`?
  For limits up to $10^{11}$, an array sieve is too large for memory. The Meissel-Lehmer algorithm or Lucy's algorithm computes the prime counting function and sum of primes in $O(\text{limit}^{3/4})$ time and $O(\text{limit}^{1/2})$ space.

## Common mistakes

- 32-bit integer overflow when accumulating `total`, resulting in wraparound negative values.
- Evaluating $i \times i$ with 32-bit signed integers: when $i \ge 46,341$, $i^2$ overflows into negative values, leading to out-of-bounds indexing or infinite loops.
- Using inclusive loop `i <= limit`, improperly adding `limit` itself when `limit` is a prime number.

## Further reading

- Sieve of Eratosthenes analysis and Mertens' second theorem.
- Lucy Hedgehog's algorithm for sum of primes in sub-linear time.
