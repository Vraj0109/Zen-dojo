---
id: c-euler-3
pattern: cses-euler
difficulty: easy
optimal: "O(sqrt n) time, O(1) space"
reviewed: false
---

## Clarify first

- What is the range of `n`? (`n` is an integer between 2 and 10^14).
- What should be returned if `n` itself is prime? (Return `n`, as the largest prime factor of a prime number is itself).
- Does the input fit in standard integer types? (With `n <= 10^{14}`, it exceeds 32-bit signed integers and requires 64-bit integer types like `long long` in C++ or `long` in Java).
- Are there edge cases with repeated small prime factors? (For powers of primes such as $2^{10} = 1024$, the answer is simply the base prime, 2).

## Examples to say out loud

- Composite number with distinct prime factors: `n = 13195`. Prime factorization gives $5 \times 7 \times 13 \times 29$. The largest prime factor is 29.
- Number with multiple identical factors: `n = 12`. Factorization is $2^2 \times 3$. The largest prime factor is 3.
- Prime input: `n = 97`. Since 97 has no divisors other than 1 and itself, the output is 97.
- Pure power of two: `n = 1024`. Factorization is $2^{10}$. The largest prime factor is 2.

## Brute force

A naive brute-force approach would start from `n` and count downward `d = n, n - 1, ..., 2`, checking whether `n % d == 0` and whether `d` is prime using a separate primality test. In the worst case where `n` is prime or near 10^14, this examines up to $10^{14}$ values, which times out completely. Furthermore, generating primes up to $10^{14}$ using a sieve requires terabytes of memory.

## The key observation

Any composite integer `n` must have at least one prime factor less than or equal to $\sqrt{n}$. If we test divisors $d \ge 2$ in increasing order and completely divide out each factor as we find it, any divisor $d$ that evenly divides the remaining quotient must necessarily be prime (all smaller composite multiples have already been removed). When $d^2 > n$, if the remaining quotient $n$ is greater than 1, that leftover quotient must be a prime number strictly greater than any factor previously extracted.

## Optimal approach

1. Track a variable `best = 1` to record the most recent prime factor found.
2. Iterate `d` starting from 2 while $d \times d \le n$:
   a. While `n % d == 0`, record `best = d` and divide `n /= d`.
   b. Increment `d`.
3. After the loop terminates, check the remaining value of `n`:
   a. If `n > 1`, the leftover value is itself prime and is the largest factor; return `n`.
   b. Otherwise, all factors were $\le \sqrt{\text{original } n}$, so return `best`.

Complexity:
- Time: `O(sqrt n)` because the loop condition checks $d \times d \le n$, which takes at most $\sqrt{10^{14}} = 10^7$ iterations, executing in a fraction of a second.
- Space: `O(1)` auxiliary space as only scalar integer variables are maintained.

## Code walkthrough

In the reference implementation:
- `long long best = 1;`: maintains the largest factor extracted during trial division.
- `for (long long d = 2; d * d <= n; d++)`: iterates through potential divisors up to $\sqrt{n}$. The condition dynamically shrinks as `n` is divided.
- `while (n % d == 0) { best = d; n /= d; }`: completely strips all instances of prime factor `d` from `n`.
- `return n > 1 ? n : best;`: handles cases where the largest prime factor exceeds the square root threshold.

## Test it out loud

- `n = 4`:
  - `d = 2`: `2 * 2 <= 4`. `4 % 2 == 0`, `best = 2`, `n` becomes 2.
  - Next inner loop: `2 % 2 == 0`, `best = 2`, `n` becomes 1.
  - Outer loop condition `2 * 2 <= 1` is false.
  - `n > 1` is false, returns `best = 2`.
- `n = 97`:
  - `d` increments from 2 to 9 ($9 \times 9 = 81 \le 97$, but $10 \times 10 = 100 > 97$). No divisor divides 97.
  - Loop terminates with `n = 97`.
  - Returns `n = 97`.
- `n = 12`:
  - `d = 2`: divides out twice, `best = 2`, `n` becomes 3.
  - `d = 3`: $3 \times 3 = 9 > 3$, loop terminates.
  - `n = 3 > 1`, returns `n = 3`.

## Follow-ups

- How can we optimize the step size of trial division?
  Handle $d = 2$ separately, then step $d = 3, 5, 7, 9, \dots$ by increments of 2, cutting the loop iterations by half. A wheel factorization (e.g., modulo 6) can skip multiples of 2 and 3.
- What if $n$ is up to $10^{18}$ or larger?
  Pollard's rho algorithm finds factors in expected $O(n^{1/4})$ time, which handles $10^{18}$ in roughly $10^{4.5} \approx 30,000$ operations.

## Common mistakes

- Not using 64-bit integers for `d`: evaluating `d * d` in 32-bit signed integers causes arithmetic overflow when $d > 46340$, leading to infinite loops or incorrect terminations.
- Dividing `n` by `d` only once instead of using a `while` loop, leaving higher powers of composite numbers intact.
- Forgetting to check `n > 1` after the loop finishes, which fails whenever the largest prime factor exceeds $\sqrt{n}$ (such as for any prime number or products of two distant primes like $2 \times 97$).

## Further reading

- Fundamental Theorem of Arithmetic and trial division methods.
- Pollard's rho algorithm for integer factorization.
