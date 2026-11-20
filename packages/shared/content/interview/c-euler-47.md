---
id: c-euler-47
pattern: cses-euler
difficulty: medium
optimal: "O(N log log N) time, O(N) space"
reviewed: false
---

## Clarify first
- What does it mean for a number to have $k$ distinct prime factors? The number has exactly $k$ different prime numbers dividing it, regardless of their multiplicities (e.g. $12 = 2^2 \times 3$ has 2 distinct prime factors: 2 and 3). This is denoted as $\omega(n) = k$.
- What is being found? The first integer $x$ of a consecutive sequence of `count` integers $x, x + 1, \dots, x + \text{count} - 1$ such that $\omega(x + i) = k$ for all $0 \le i < \text{count}$.
- What are the parameter ranges? $1 \le k \le 4$ and $1 \le \text{count} \le 4$.
- What upper limit is guaranteed? A valid run is guaranteed to exist below $N = 5,000,000$.

## Examples to say out loud
- Consider $k = 2$ and $\text{count} = 2$.
  - 14: $14 = 2 \times 7$ ($\omega(14) = 2$)
  - 15: $15 = 3 \times 5$ ($\omega(15) = 2$)
  Two consecutive numbers with 2 distinct prime factors each.
  The first number is 14.
- Consider $k = 3$ and $\text{count} = 3$.
  The sequence is 644, 645, 646:
  - $644 = 2^2 \times 7 \times 23$ ($\omega = 3$)
  - $645 = 3 \times 5 \times 43$ ($\omega = 3$)
  - $646 = 2 \times 17 \times 19$ ($\omega = 3$)
  Returns 644.
- Consider $k = 1, \text{count} = 1 \to$ first prime power is 2 $\to$ returns 2.

## Brute force
A naive approach would test integers $x = 2, 3, 4, \dots$ one by one, factorizing each number independently using trial division until finding `count` consecutive numbers with $\omega = k$. Factoring numbers individually up to millions takes substantial time. Instead, an additive sieve computes $\omega(n)$ for all numbers simultaneously in near-linear time.

## The key observation
We can compute $\omega(x)$ (the number of distinct prime factors of $x$) for all $x \le N$ using an additive sieve variant of the Sieve of Eratosthenes:
1. Initialize an array $\omega$ of size $N + 1$ with zeros.
2. For each integer $p$ from 2 to $N$:
   - If $\omega[p] == 0$, then $p$ is a prime.
   - For all multiples $m = p, 2p, 3p, \dots \le N$, increment $\omega[m]++$.
Once the sieve is populated, we scan from 2 to $N$, tracking the length of the current streak where $\omega[x] == k$. As soon as `streak == count`, the starting number is $x - \text{count} + 1$.

## Optimal approach
1. Set $N = 5,000,000$.
2. Allocate array `om` of size $N + 1$ (using unsigned 8-bit integers `unsigned char` or `byte` since $\omega(x) \le 8$ for $x \le 5 \times 10^6$).
3. For $p = 2$ to $N$:
   - If `om[p] == 0`:
     - For $m = p; m \le N; m += p$:
       - `om[m]++`.
4. Initialize `run = 0`.
5. For $x = 2$ to $N$:
   - If `om[x] == k`:
     - `run++`.
     - If `run == count`, return $x - \text{count} + 1$.
   - Else:
     - `run = 0`.
6. Return -1 if not found.
7. Complexity:
   - Time Complexity: $O(N \log \log N)$ to run the sieve over primes up to $N = 5 \times 10^6$, followed by an $O(N)$ linear scan. Runtime is ~40 milliseconds in C++.
   - Space Complexity: $O(N)$ memory, which is only 5 MB using a byte array.

## Code walkthrough
- `const int N = 5000000; vector<unsigned char> om(N + 1, 0);`: Compact byte array tracking $\omega(x)$.
- `for (int p = 2; p <= N; p++) if (om[p] == 0) for (int m = p; m <= N; m += p) om[m]++;`: Prime sieve incrementing factor count at every multiple.
- `int run = 0;`: Consecutive streak counter.
- `if (om[x] == k) { run++; if (run == count) return x - count + 1; }`: Match check and immediate return of run start.
- `else run = 0;`: Reset streak when factor count differs from $k$.

## Test it out loud
- Test 1: $k = 1, \text{count} = 1 \to \omega(2) = 1 \to$ returns 2.
- Test 2: $k = 2, \text{count} = 1 \to \omega(6) = 2$ ($6 = 2 \times 3$) $\to$ returns 6.
- Test 3: $k = 2, \text{count} = 2 \to 14, 15 \to$ returns 14.
- Test 4: $k = 2, \text{count} = 3 \to 20, 21, 22 \to$ returns 20.
- Test 5: $k = 3, \text{count} = 3 \to$ returns 644.

## Follow-ups
- What is the answer for $k = 4, \text{count} = 4$?
  The famous Project Euler problem 47 solution: 134043 ($134043, 134044, 134045, 134046$).
- Why use `unsigned char` instead of `int`?
  The smallest number with 8 distinct prime factors is $2 \times 3 \times 5 \times 7 \times 11 \times 13 \times 17 \times 19 = 9,699,690 > 5 \times 10^6$. Hence $\omega(x) \le 7$ for all $x \le 5 \times 10^6$, which comfortably fits in an 8-bit byte, saving 15 MB of memory and improving cache locality.

## Common mistakes
- Counting total prime factors with multiplicity $\Omega(n)$ instead of distinct prime factors $\omega(n)$ (e.g. treating 12 as 3 factors instead of 2).
- Factoring each number individually, which results in TLE.
- Resetting `run` incorrectly or returning $x$ instead of $x - \text{count} + 1$.
