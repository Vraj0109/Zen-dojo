---
id: cses-binomial-coefficients
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(M + q) time, O(M) space"
reviewed: false
---

## Clarify first
- What formula defines the binomial coefficient? a choose b = a! / (b! * (a - b)!) for 0 <= b <= a. If b < 0 or b > a, the result is 0.
- What modulo is used? Modulo 10^9 + 7 (1,000,000,007), which is a prime number.
- What are the constraints on the number of queries and input values? Up to 100,000 queries, with a up to 1,000,000.
- What is the convention for 0 choose 0? 0! / (0! * 0!) = 1 / (1 * 1) = 1.
- What should be returned? A list containing the answer for each query in order.

## Examples to say out loud
Suppose queries are [3, 1], [5, 3], and [6, 0].
- 3 choose 1 is 3! / (1! * 2!) = 6 / 2 = 3.
- 5 choose 3 is 5! / (3! * 2!) = 120 / (6 * 2) = 10.
- 6 choose 0 is 6! / (0! * 6!) = 1.
The resulting list is [3, 10, 1].

For edge case [0, 0], 0 choose 0 is 1. If b > a, such as [2, 5], the answer is 0.

## Brute force
For each query, compute a! modulo 10^9 + 7 in O(a) steps, then compute b! and (a - b)!, and use Fermat's Little Theorem modular inverse (x^(p - 2) mod p) to perform division.
With 10^5 queries and a up to 10^6, calculating factorials on each query requires O(q * a) operations, reaching 10^11 operations, which will cause a major timeout.
Since all queries share the same prime modulus 10^9 + 7 and maximum value M <= 10^6, precomputing factorials and inverse factorials allows answering every query in O(1) time.

## The key observation
Division modulo a prime p is equivalent to multiplication by the modular multiplicative inverse.
By Fermat's Little Theorem, x^(p - 1) = 1 (mod p) for any x not divisible by p, so x^(-1) = x^(p - 2) mod p.
We can precompute an array `fact` of factorials up to M in O(M) time.
Crucially, instead of running binary exponentiation M times to find each inverse factorial, we can compute `invFact[M] = (fact[M])^(p - 2) mod p` once in O(log p) time, and then compute all preceding inverse factorials backwards in O(M) time using the recurrence `invFact[i - 1] = invFact[i] * i mod p`.
Every subsequent query [a, b] is then answered in O(1) time via `fact[a] * invFact[b] % MOD * invFact[a - b] % MOD`.

## Optimal approach
1. Scan all queries to find `maxA = max(q[0])`. Let M = max(1, maxA).
2. Allocate arrays `fact` and `invFact` of size M + 1.
3. Compute factorials: `fact[0] = 1`, and `fact[i] = (fact[i - 1] * i) % 1000000007` for i from 1 to M.
4. Compute `invFact[M] = power(fact[M], MOD - 2)` using binary exponentiation.
5. Compute inverse factorials backwards: for i from M - 1 down to 0, set `invFact[i] = (invFact[i + 1] * (i + 1)) % MOD`.
6. For each query [a, b]:
   - If b < 0 or b > a, output 0.
   - Else, output `(fact[a] * invFact[b] % MOD * invFact[a - b]) % MOD`.
7. Return the answers list.

Complexity: O(M + q) time (O(M) precomputation and O(1) per query), and O(M) space for factorial tables.

## Code walkthrough
In C++, `maxA` is capped at at least 1.
The factorial loop uses `long long` multiplications modulo `1000000007`.
The lambda `power(base, exp)` performs standard repeated squaring to compute `(fact[maxA])^(MOD - 2) % MOD`.
The backwards loop uses `invFact[i] = (invFact[i + 1] * (i + 1)) % MOD` because 1 / i! = (i + 1) / (i + 1)!.
For each query, boundary check `if (b < 0 || b > a)` handles impossible selections by pushing 0.
Otherwise, two modular multiplications yield the result in O(1) time.

## Test it out loud
- Base case [0, 0]: `fact[0] * invFact[0] * invFact[0] = 1 * 1 * 1 = 1`.
- Symmetry check: [5, 2] and [5, 3] both evaluate to 10.
- Out of bounds: [4, 5] has b > a, returns 0.
- Full selection: [4, 4] gives 4 choose 4 = 1.
- Large input: [1000000, 500000] evaluates factorials modulo 10^9 + 7 cleanly without intermediate 64-bit overflow.

## Follow-ups
- What if the modulus was not prime? Fermat's Little Theorem only applies to prime moduli. For composite moduli, prime factorization with Lucas' theorem or Chinese Remainder Theorem is required.
- What if a and b were up to 10^18 but modulus p was small (p <= 10^6)? Lucas' Theorem decomposes a and b in base p: (a choose b) = product of (a_i choose b_i) mod p.
- Can we compute individual combinations without precomputing all factorials? Yes, using a / 1 * (a - 1) / 2 * ... in O(b log p), which is efficient when b is small.

## Common mistakes
- Computing modular inverse on every query: calling `power` on each query degrades complexity to O(q * log MOD), which is ~30x slower and can time out.
- Forgetting to modulo before multiplying: chaining `fact[a] * invFact[b] * invFact[a - b]` without intermediate `% MOD` exceeds 64-bit integer limits (`10^9 * 10^9 * 10^9 = 10^27`).
- Neglecting the `b > a` check: without checking `b > a`, `a - b` becomes negative, leading to out-of-bounds indexing in `invFact`.

## Further reading
- Fermat's Little Theorem and modular multiplicative inverses
- Backward precomputation of inverse factorials
- Lucas' theorem for binomial coefficients modulo primes
