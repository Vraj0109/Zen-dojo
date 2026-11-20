---
id: c-euler-1
pattern: cses-euler
difficulty: easy
optimal: "O(log(min(a, b))) time, O(1) space"
reviewed: false
---

## Clarify first

- Are `a` and `b` strictly positive integers? (Yes, constraints indicate both `a` and `b` are between 1 and 1,000,000).
- Is `limit` inclusive or exclusive? (The sum considers all positive whole numbers strictly below `limit`).
- How should numbers divisible by both `a` and `b` be handled? (They must be counted exactly once, applying the principle of inclusion-exclusion).
- Can the accumulated sum exceed standard 32-bit integer limits? (Yes, with `limit` up to 10^8, the sum can reach roughly 3 * 10^15, requiring 64-bit integers like `long long` or `long`).
- What if `a` equals `b`? (Inclusion-exclusion still holds: the least common multiple is `a`, so `f(a) + f(a) - f(a) = f(a)`).

## Examples to say out loud

- Standard case: `limit = 10, a = 3, b = 5`. Multiples of 3 below 10 are 3, 6, 9 (sum = 18). Multiples of 5 below 10 is 5 (sum = 5). Common multiple 15 is not below 10. Total sum is `18 + 5 - 0 = 23`.
- Shared multiple case: `limit = 20, a = 3, b = 5`. Multiples of 3 below 20 are 3, 6, 9, 12, 15, 18. Multiples of 5 below 20 are 5, 10, 15. The value 15 is divisible by both 3 and 5. It is added in both lists, so we subtract it once via `lcm(3, 5) = 15`. The result is 78.
- Boundary case: `limit = 1, a = 3, b = 5`. No positive integer is strictly less than 1, so the result is 0.

## Brute force

A direct simulation would iterate through every integer `i` from 1 up to `limit - 1`, checking whether `i % a == 0 || i % b == 0`, and accumulating qualifying values into a 64-bit integer. Correctness is straightforward since every candidate number is tested against divisibility. However, with `limit` up to 10^8, running 100 million modulo operations per query is inefficient and unnecessary when closed-form arithmetic progression formulas exist.

## The key observation

The multiples of any integer `d` strictly below `limit` form an arithmetic sequence: `d, 2d, 3d, ..., m * d`, where `m = (limit - 1) / d`. Factoring out `d`, the sum is `d * (1 + 2 + ... + m) = d * m * (m + 1) / 2`. By applying this closed-form formula to `a` and `b`, and subtracting the sum of multiples of `lcm(a, b)`, we eliminate double-counting in `O(log(min(a, b)))` time using the Euclidean algorithm for greatest common divisor.

## Optimal approach

1. Define a helper function `f(limit, d)` that computes the sum of multiples of `d` below `limit`:
   a. Compute the number of multiples: `m = (limit - 1) / d`.
   b. Return `d * m * (m + 1) / 2` using 64-bit integer arithmetic to prevent overflow.
2. Compute the greatest common divisor `gcd(a, b)` using the Euclidean algorithm.
3. Compute the least common multiple: `lcm = (a / gcd(a, b)) * b`.
4. Return the combined sum using inclusion-exclusion: `f(limit, a) + f(limit, b) - f(limit, lcm)`.

Complexity:
- Time: `O(log(min(a, b)))` time to compute the greatest common divisor via Euclid's algorithm, followed by constant time arithmetic evaluations.
- Space: `O(1)` auxiliary space as no additional dynamic structures or arrays are needed.

## Code walkthrough

In the reference implementation:
- `long long m = (limit - 1) / d;`: determines the maximum integer multiplier such that `m * d < limit`.
- `return d * m * (m + 1) / 2;`: calculates the sum of the first `m` multiples using the Gaussian summation formula.
- `long long l = (long long)a / __gcd(a, b) * b;`: computes the least common multiple, dividing before multiplying to prevent intermediate 64-bit overflow.
- `return f(limit, a) + f(limit, b) - f(limit, l);`: executes the inclusion-exclusion formula to deduct duplicate contributions from common multiples.

## Test it out loud

- `limit = 4, a = 3, b = 5`:
  - Multiples of 3 below 4: `m = 3 / 3 = 1`, sum is `3 * 1 * 2 / 2 = 3`.
  - Multiples of 5 below 4: `m = 3 / 5 = 0`, sum is 0.
  - Multiples of 15 below 4: sum is 0.
  - Final sum is `3 + 0 - 0 = 3`.
- `limit = 100, a = 7, b = 7`:
  - `lcm(7, 7) = 7`.
  - `f(100, 7) = 7 * 14 * 15 / 2 = 735`.
  - Result is `735 + 735 - 735 = 735`.
- `limit = 50, a = 1, b = 2`:
  - Every number below 50 is a multiple of 1. `lcm(1, 2) = 2`.
  - `f(50, 1) + f(50, 2) - f(50, 2) = f(50, 1) = 1 * 49 * 50 / 2 = 1225`.

## Follow-ups

- What if there are `k` numbers instead of just two (`a` and `b`)?
  We would generalize using the full principle of inclusion-exclusion across all non-empty subsets of size up to `k`, running in `O(2^k * k * log(val))` time.
- What if `limit` is up to 10^18?
  The arithmetic formulas naturally scale to 10^18, provided 128-bit arithmetic is used to prevent overflow during the product `m * (m + 1)`.

## Common mistakes

- Using 32-bit signed integers for intermediate products, causing integer overflow when `limit` exceeds 10^5.
- Using inclusive bound `limit / d` instead of `(limit - 1) / d`, improperly including `limit` itself when `limit` is a multiple of `d`.
- Computing `lcm(a, b)` as `(a * b) / gcd(a, b)`, which can overflow 64-bit integers if `a * b` exceeds `2^63 - 1` before division. Dividing first as `(a / gcd(a, b)) * b` avoids this.

## Further reading

- Arithmetic progression sum derivations and properties.
- Euclidean algorithm for greatest common divisor and least common multiple relations.
- The principle of inclusion-exclusion in combinatorial mathematics.
