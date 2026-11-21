---
id: c-euler-35
pattern: cses-euler
difficulty: medium
optimal: "O(N log log N) for the sieve with N = 10^k, plus O(count * digits) for the rotations, O(N) space"
brute: same
reviewed: false
---

## Clarify first

- What is a circular prime? (A prime number where every cyclic rotation of its decimal digits is also a prime number; for example, 197 has rotations 971 and 719, all three of which are prime).
- Are single-digit primes considered circular? (Yes, single-digit primes 2, 3, 5, 7 have only 1 cyclic rotation, itself, and are circular primes).
- Can the rotated numbers exceed `limit`? (Yes, the original number $p$ must be strictly below `limit`, but its cyclic rotations are allowed to exceed `limit`; they only need to be prime).
- What are the constraints on `limit`? ($2 \le \text{limit} \le 10,000,000$).
- What should be returned? (The total count of circular primes strictly below `limit`).

## Examples to say out loud

- Single-digit limit: `limit = 10`. Primes below 10 are 2, 3, 5, 7. All 4 are circular. Output is 4.
- Standard case: `limit = 100`. Circular primes below 100: 2, 3, 5, 7, 11, 13, 17, 31, 37, 71, 73, 79, 97 (total 13). Output is 13.
- Base boundary: `limit = 2`. No primes exist below 2. Output is 0.

## Brute force

A brute-force strategy iterates over every odd number below `limit`, tests if it is prime via trial division, and if so, generates all its rotations and tests each rotation for primality using trial division. With `limit = 10,000,000`, testing primality for millions of numbers and their rotations using unmemoized trial division requires tens of billions of operations, causing a timeout.

## The key observation

To verify primality of rotations in $O(1)$ time, we should precompute a prime sieve. Because rotating a $k$-digit number preserves the exact number of digits, any rotation of a number below `limit` has at most $k$ digits, where $k$ is the number of digits in `limit - 1`. The maximum possible rotation cannot exceed $10^k - 1$.
Therefore, if we sieve primes up to $10^k$ (the smallest power of 10 that is $\ge \text{limit}$), all possible cyclic rotations of all primes below `limit` fall inside our precomputed sieve table.
For each prime $p < \text{limit}$, we perform $k$ cyclic digit shifts, checking if every rotated value is marked prime in the sieve.

## Optimal approach

1. Find the upper bound of the sieve: compute `bound = 10` while `bound < limit`, updating `bound *= 10`.
2. Run the Sieve of Eratosthenes up to `bound`:
   - Allocate boolean/byte array `comp` of size `bound + 1`.
   - Mark `comp[0] = comp[1] = 1`.
   - For $i = 2 \dots \sqrt{\text{bound}}$: if not composite, mark multiples $j = i^2, i^2 + i, \dots \le \text{bound}$ as composite.
3. Initialize `count = 0`.
4. For each integer $p$ from 2 up to `limit - 1`:
   a. If `comp[p]` is true, continue.
   b. Count the number of digits `digits` and highest place value `pw = 10^(digits - 1)`.
   c. Check all rotations:
      - For $i = 0 \dots \text{digits} - 1$:
        - Rotate digits: `x = (x % pw) * 10 + x / pw`.
        - If `comp[x]` is true, mark `ok = false` and break.
   d. If `ok` is true, increment `count++`.
5. Return `count`.

Complexity:
- Time: `O(N log log N)` for the sieve with $N = 10^{\lceil \log_{10} \text{limit} \rceil} \le 10^7$, plus $O(\pi(\text{limit}) \times \text{digits})$ for rotating the primes. For $\text{limit} = 10^7$, the sieve takes $\approx 0.1$ seconds and the verification pass takes under 50 ms.
- Space: `O(N)` auxiliary space for the sieve byte array of size up to 10 MB.

## Code walkthrough

In the reference implementation:
- `while (bound < limit) bound *= 10;`: computes the next power of 10 so all rotations of $k$-digit numbers stay within the sieve boundaries.
- `vector<char> comp(bound + 1, 0);`: creates a compact sieve array avoiding bit-proxy overhead.
- `x = (x % pw) * 10 + x / pw;`: performs a single digit cyclic shift in integer arithmetic without string manipulation.
- `if (comp[x]) ok = false;`: checks primality of the rotated number in $O(1)$ time.
- `if (ok) count++;`: increments only when every cyclic rotation is confirmed prime.

## Test it out loud

- `limit = 2`:
  - Loop does not run. Returns 0.
- `limit = 3`:
  - $p = 2$: 1 digit, $2 \to 2$, prime. `count = 1`. Returns 1.
- `limit = 12`:
  - Single digit primes: 2, 3, 5, 7 (4).
  - Two-digit: 11 has rotation 11 (prime).
  - Total is $4 + 1 = 5$. Returns 5.
- `limit = 20`:
  - 13 has rotation 31 (prime), 17 has rotation 71 (prime).
  - $5 + 2 = 7$. Returns 7.

## Follow-ups

- Can we prune candidate numbers before checking rotations?
  Yes, any multi-digit number containing an even digit (0, 2, 4, 6, 8) or 5 can never be a circular prime (except 2 and 5 themselves), because rotating that even digit or 5 to the units place creates a composite number divisible by 2 or 5. We can skip any number containing $\{0, 2, 4, 5, 6, 8\}$.
- How to generate circular primes constructively?
  Construct numbers using only digits $\{1, 3, 7, 9\}$ up to $k$ digits, testing only that restricted subset.

## Common mistakes

- Sieving only up to `limit` instead of $10^k$: when `limit = 200`, $p = 197$ is below 200, but its rotation 971 is $> 200$, causing an out-of-bounds error if the sieve stops at `limit`.
- Converting numbers to strings for digit rotation, which causes millions of string allocations and runs 10x slower.
- Forgetting that 2 and 5 are circular primes even though they are even / end in 5 (as single-digit primes, they never rotate to a different composite number).

## Further reading

- Sieve of Eratosthenes memory optimizations.
- Permutable and circular primes in recreational number theory.
