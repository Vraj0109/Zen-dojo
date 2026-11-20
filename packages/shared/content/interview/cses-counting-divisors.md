---
id: cses-counting-divisors
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(sqrt(x)) time, O(1) space"
reviewed: false
---

## Clarify first
- What range of values can x take? A positive integer 1 <= x <= 1,000,000.
- Does "divisors" include 1 and x itself? Yes, all positive divisors from 1 up to x.
- What if x is a perfect square? The square root divisor sqrt(x) must be counted only once, not twice.
- What is the expected return value? An integer representing the count of distinct positive divisors.
- Can x = 1? Yes, 1 has exactly 1 positive divisor (itself).

## Examples to say out loud
Suppose x = 16.
Testing divisors up to sqrt(16) = 4:
- d = 1 divides 16: contributes two divisors (1 and 16).
- d = 2 divides 16: contributes two divisors (2 and 8).
- d = 3 does not divide 16.
- d = 4 divides 16 with d * d == 16: contributes one divisor (4).
Total count = 2 + 2 + 1 = 5 divisors.

Suppose x = 17.
17 is prime. The loop runs up to floor(sqrt(17)) = 4.
Only d = 1 divides 17, contributing 1 and 17. Total count is 2.

## Brute force
A naive approach would test every number d from 1 up to x, checking if `x % d == 0`.
This linear scan takes O(x) time. While manageable for a single query of 10^6, it tests up to 1,000,000 iterations per number.
Divisors inherently occur in complementary pairs, meaning we never need to search beyond the square root of x.

## The key observation
If d is a divisor of x (i.e. x % d == 0), then its complement `x / d` is also a divisor.
One of these two numbers must be <= sqrt(x), and the other must be >= sqrt(x).
Therefore, iterating d strictly from 1 up to floor(sqrt(x)) discovers every factor pair.
If d != x / d, we count 2 divisors; if d == x / d (when x is a perfect square), we count 1 divisor.

## Optimal approach
1. Initialize a counter `count = 0`.
2. Iterate `d` starting from 1 while `d * d <= x`:
   - If `x % d == 0`:
     - If `d * d == x`, increment `count` by 1.
     - Else, increment `count` by 2 (accounting for both d and x / d).
   - Increment d.
3. Return `count`.

Complexity: O(sqrt(x)) time because the loop executes at most sqrt(10^6) = 1,000 times, and O(1) space.

## Code walkthrough
In C++, the loop condition `for (int d = 1; d * d <= x; d++)` avoids floating-point `sqrt()` calls and rounding pitfalls.
Inside the loop, `if (x % d == 0)` detects a valid factor.
The nested check `if (d * d == x) count += 1; else count += 2;` handles perfect squares cleanly without double counting the square root.
For x = 1, the loop runs for d = 1, enters `d * d == 1`, adds 1, and finishes, correctly returning 1.

## Test it out loud
- Smallest input x = 1: d = 1, `1 * 1 <= 1`. `1 % 1 == 0` and `1 * 1 == 1`, so `count += 1`. Next d = 2 terminates loop. Returns 1.
- Prime number x = 2: d = 1 adds 2 (1 and 2). Next d = 2 has `2 * 2 = 4 > 2`, terminates loop. Returns 2.
- Composite non-square x = 12: d = 1 (1, 12), d = 2 (2, 6), d = 3 (3, 4). Loop ends since `4 * 4 = 16 > 12`. Count is 6.
- Perfect square x = 36: d = 1 (pair), d = 2 (pair), d = 3 (pair), d = 4 (pair), d = 6 (single). Total count = 2 * 4 + 1 = 9.

## Follow-ups
- What if there are Q queries with Q up to 100,000? Running O(sqrt(x)) for each takes 10^5 * 10^3 = 10^8 operations. Instead, we can precompute smallest prime factors using a sieve up to 10^6 in O(M log log M), then factorize each number in O(log x) via prime factorization: tau(x) = product of (e_i + 1).
- What if we want the sum of divisors rather than count? The same pair logic applies: add `d + x / d` (or `d` if `d * d == x`).
- How does divisor count relate to prime factorization? If x = p1^a * p2^b * ..., the number of divisors is exactly (a + 1)(b + 1)...

## Common mistakes
- Double counting the square root: adding 2 when `d * d == x` would report 6 divisors for 16 instead of 5.
- Loop condition integer overflow: if x were up to 10^14, `d * d` in a 32-bit integer would overflow; with x <= 10^6, 32-bit integer `d * d` stays well within limits (max 10^6).
- Floating-point inaccuracies with `sqrt()`: using `d <= sqrt(x)` with floating-point conversions can occasionally drop or add boundary elements due to precision error. Using `d * d <= x` is exact.

## Further reading
- Divisor counting function and arithmetic properties
- Sieve of Eratosthenes for batch prime factorization
- Highly composite numbers and divisor bounds
