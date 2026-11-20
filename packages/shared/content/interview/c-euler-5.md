---
id: c-euler-5
pattern: cses-euler
difficulty: easy
optimal: "O(n log n) time, O(1) space"
reviewed: false
---

## Clarify first

- What is the range of `n`? (`n` is an integer between 1 and 40).
- Must the result be divisible by every integer from 1 through `n` simultaneously? (Yes, it is the least common multiple of all integers from 1 up to `n`).
- Can the answer exceed 32-bit integer limits? (Yes, for $n = 40$ the least common multiple is approximately $5 \times 10^{15}$, so 64-bit integer types must be used).
- What should be returned for the base case `n = 1`? (The smallest positive integer divisible by 1 is 1).

## Examples to say out loud

- Base case: `n = 4`. The numbers are 1, 2, 3, 4. The least common multiple is $\text{lcm}(1, 2, 3, 4) = 12$. 12 is divisible by 1, 2, 3, and 4.
- Standard case: `n = 10`. The integers are 1 through 10. Factoring each number shows we need $2^3 = 8, 3^2 = 9, 5^1 = 5, 7^1 = 7$. Their product is $8 \times 9 \times 5 \times 7 = 2520$.
- Small boundary: `n = 1`. Returns 1.
- Small prime: `n = 3`. $\text{lcm}(1, 2, 3) = 6$. Returns 6.

## Brute force

A brute-force solution increments a candidate number $x$ starting from $n$ by steps of $n$ ($x = n, 2n, 3n, \dots$), testing divisibility by all integers from 1 to $n$. For $n = 40$, the answer is over $5 \times 10^{15}$. Stepping through candidates one by one or by multiples of 40 would require more than $10^{14}$ loop checks, which would take days to compute and fail time limits completely.

## The key observation

The least common multiple operation is associative: $\text{lcm}(1, 2, \dots, n) = \text{lcm}(\text{lcm}(1, \dots, n - 1), n)$. We can compute the cumulative LCM iteratively from $i = 1$ to $n$. Using the identity $\text{lcm}(a, b) = \frac{a \times b}{\text{gcd}(a, b)}$, we can evaluate each step with Euclid's greatest common divisor algorithm. Dividing $a$ by $\text{gcd}(a, b)$ before multiplying by $b$ prevents intermediate integer overflow.

## Optimal approach

1. Initialize a 64-bit accumulator `result = 1`.
2. Loop through every integer `i` from 2 up to `n`:
   a. Compute $g = \text{gcd}(\text{result}, i)$ using the Euclidean algorithm.
   b. Update `result = (result / g) * i`.
3. Return `result`.

Complexity:
- Time: `O(n log n)` because the loop executes $n - 1$ times, and in each iteration Euclid's algorithm on values bounded by $\text{lcm} \le 5 \times 10^{15}$ and $i \le n$ takes $O(\log i)$ steps.
- Space: `O(1)` auxiliary space since only scalar variables are used.

## Code walkthrough

In the reference implementation:
- `long long result = 1;`: maintains the running least common multiple in 64-bit precision.
- `for (int i = 2; i <= n; i++)`: folds each integer from 2 up to `n` into the running answer.
- `result / __gcd(result, (long long)i) * i;`: safely updates the cumulative LCM by dividing by the greatest common divisor prior to multiplying by `i`, protecting against overflow.

## Test it out loud

- `n = 1`: loop does not execute; returns initial `result = 1`.
- `n = 2`:
  - `i = 2`: `gcd(1, 2) = 1`. `result = (1 / 1) * 2 = 2`. Returns 2.
- `n = 4`:
  - `i = 2`: `result = 2`.
  - `i = 3`: `gcd(2, 3) = 1`. `result = (2 / 1) * 3 = 6`.
  - `i = 4`: `gcd(6, 4) = 2`. `result = (6 / 2) * 4 = 12`.
  - Returns 12.

## Follow-ups

- Can this be solved using prime factorizations?
  Yes, by identifying all primes $p \le n$ and finding the highest power $p^k \le n$. The answer is $\prod p^k$. For $n = 10$, primes are 2, 3, 5, 7, with maximum powers $2^3=8, 3^2=9, 5^1=5, 7^1=7$, multiplying to 2520.
- What if $n$ is very large (e.g., $n = 10^6$)?
  The prime factorization approach combined with a prime sieve (Sieve of Eratosthenes) computes the prime powers in $O(n)$, and big-integer arithmetic or modular arithmetic evaluates the product.

## Common mistakes

- Multiplying before dividing: computing `(result * i) / gcd` can cause 64-bit signed overflow when `result * i > 2^63 - 1`, whereas `(result / gcd) * i` avoids this overflow because `result` is always divisible by `gcd`.
- Using 32-bit integers, which overflow once $n \ge 13$ ($\text{lcm}(1..13) = 360,360$, but $\text{lcm}(1..14) = 720,720$ and by $n=20$ it is $\approx 2.32 \times 10^8$, and by $n=24$ it exceeds $2 \times 10^9$).
- Attempting candidate search with increment loops rather than algebraic accumulation.

## Further reading

- Euclidean algorithm and binary GCD computation.
- Properties of the least common multiple and Chebyshev's function $\psi(n) = \ln(\text{lcm}(1, \dots, n))$.
