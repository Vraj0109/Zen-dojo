---
id: c-euler-7
pattern: cses-euler
difficulty: easy
optimal: "O(L log log L) time, O(L) space, where L is about n ln n"
brute: same
reviewed: false
---

## Clarify first

- What is the range of `n`? (`n` is an integer between 1 and 1,000,000).
- How are primes indexed? (1-indexed: the 1st prime is 2, the 2nd is 3, the 6th is 13).
- What upper bound can we assume on the magnitude of the $n$-th prime? (By Rosser's theorem and the Prime Number Theorem, $p_n < n(\ln n + \ln \ln n)$ for $n \ge 6$; for $n = 10^6$, the 1,000,000th prime is $15,485,863$).
- Can the answer fit in a 32-bit signed integer? (Yes, the 1,000,000th prime is $\approx 1.55 \times 10^7$, well within 32-bit `int` limits).

## Examples to say out loud

- Base case: `n = 1`. Counting begins at 2, so the first prime is 2.
- Small case: `n = 6`. The sequence of primes is 2, 3, 5, 7, 11, 13. The 6th prime is 13.
- Medium case: `n = 10`. Primes are 2, 3, 5, 7, 11, 13, 17, 19, 23, 29. The 10th prime is 29.

## Brute force

A naive brute-force method tests consecutive odd integers starting from 3 for primality using trial division up to $\sqrt{x}$. When a prime is found, increment a counter until reaching `n`. For $n = 10^6$, checking primality by trial division takes $\sum_{i=1}^{10^6} O(\sqrt{p_i}) \approx 10^6 \times \sqrt{1.5 \times 10^7} \approx 3.8 \times 10^9$ operations, which takes tens of seconds and exceeds standard time limits.

## The key observation

Instead of testing each number independently, the Sieve of Eratosthenes marks composite numbers across an entire range in nearly linear time. Using the mathematical bound $p_n < n(\ln n + \ln \ln n)$ for $n \ge 6$, we can pre-estimate an upper bound $L$ containing at least $n$ primes. Marking multiples of each prime starting from $i^2$ up to $L$ computes all primes simultaneously in $O(L \log \log L)$ time.

## Optimal approach

1. If $n < 6$, set upper bound `limit = 100`. Otherwise, compute `limit = (int)(n * (log(n) + log(log(n)))) + 10`.
2. Allocate a boolean or byte array `composite` of size `limit + 1` initialized to false (0).
3. Initialize `count = 0`.
4. Iterate `i` from 2 up to `limit`:
   a. If `composite[i]` is true, continue.
   b. Otherwise, `i` is prime. Increment `count`.
   c. If `count == n`, return `i`.
   d. For multiples of `i`, mark `composite[j] = 1` for $j = i \times i, i \times i + i, \dots, \le \text{limit}$.
5. Return -1 if the loop finishes without reaching $n$ (unreachable with a correct bound).

Complexity:
- Time: `O(L log log L)` where $L \approx n \ln n$, which for $n = 10^6$ requires roughly $1.6 \times 10^7 \times \log \log(1.6 \times 10^7) \approx 4.5 \times 10^7$ basic operations, finishing in under 150 ms.
- Space: `O(L)` auxiliary space for the byte array of size ~16 MB.

## Code walkthrough

In the reference implementation:
- `int limit = 100; if (n >= 6) limit = (int)(n * (log((double)n) + log(log((double)n)))) + 10;`: sets an analytical upper bound guaranteeing at least $n$ primes are present.
- `vector<char> composite(limit + 1, 0);`: uses `char` rather than `vector<bool>` to avoid bit-proxy overhead and maintain memory efficiency.
- `if (++count == n) return i;`: early-exits immediately upon identifying the $n$-th prime, skipping unnecessary sieve crossings.
- `for (long long j = (long long)i * i; j <= limit; j += i)`: marks composites starting at $i^2$, using 64-bit integer arithmetic to prevent overflow when $i > 46340$.

## Test it out loud

- `n = 1`:
  - `limit = 100`.
  - `i = 2`: `composite[2] = 0`. `++count` becomes 1. `count == 1` matches `n`. Returns 2 immediately.
- `n = 2`:
  - `i = 2`: prime, `count = 1`. Crosses out 4, 6, 8, ...
  - `i = 3`: `composite[3] = 0`. `++count` becomes 2. Returns 3.
- `n = 6`:
  - `limit` computed via formula $> 13$.
  - Primes encountered: 2 (1), 3 (2), 5 (3), 7 (4), 11 (5), 13 (6). Returns 13.

## Follow-ups

- How to handle multiple queries for various values of $n$?
  Precompute a single sieve up to $1.6 \times 10^7$, collect all primes into a flat array `primes`, and answer any query in $O(1)$ by indexing `primes[n - 1]`.
- How can we cut memory usage by half?
  Sieve only odd numbers, storing indices representing $2k + 1$. This cuts memory to $\approx 8$ MB and doubles cache throughput.

## Common mistakes

- 32-bit overflow when calculating $i \times i$ in the inner sieve loop: when $i = 50,000$, $i^2 = 2.5 \times 10^9 > 2^{31} - 1$, causing integer overflow and infinite loops unless cast to `long long`.
- Choosing an insufficient upper bound $L$ (like $n \ln n$ without the second-order term $\ln \ln n$), causing the sieve to terminate before encountering the $n$-th prime.
- Calling `log(log(n))` when $n < 3$, where $\ln(n) \le 1$ and $\ln(\ln(n)) \le 0$ or undefined. Handled by gating $n \ge 6$.

## Further reading

- Prime Number Theorem and Rosser's upper bounds on the $n$-th prime.
- Segmented Sieve of Eratosthenes for cache-friendly memory scaling.
