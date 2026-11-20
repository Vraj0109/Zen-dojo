---
id: c-euler-58
pattern: cses-euler
difficulty: hard
optimal: "O(ans * log^2(ans)) time, O(1) space"
reviewed: false
---

## Clarify first
- How is the number spiral constructed? Start with 1 at the center, then spiral outward in square rings of odd side length $s = 3, 5, 7, \dots$.
- What numbers lie on the diagonals?
  For side length $s$, the four corners of the outer ring are:
  - Bottom-right: $s^2$
  - Bottom-left: $s^2 - (s - 1)$
  - Top-left: $s^2 - 2(s - 1)$
  - Top-right: $s^2 - 3(s - 1)$
- How many total numbers are on the diagonals of a spiral of side length $s$? There are $2s - 1$ total diagonal numbers (1 at the center, plus 4 numbers per ring for $(s - 1)/2$ rings).
- What is the stopping condition? Return the smallest odd side length $s \ge 3$ at which the percentage of primes among all diagonal numbers is strictly below `percent` (i.e. $\frac{\text{primes}}{2s - 1} \times 100 < \text{percent}$).
- What is the range of `percent`? $8 \le \text{percent} \le 60$.
- How large can corner numbers be? For $\text{percent} = 10$, $s \approx 26,241$, so corner numbers reach $s^2 \approx 7 \times 10^8$. For $\text{percent} = 8$, numbers can exceed $10^{10}$, requiring 64-bit integer arithmetic and efficient primality testing like Miller-Rabin.

## Examples to say out loud
- For $s = 3$:
  Corners are 9, 7, 5, 3.
  Primes among them: 3, 5, 7 (3 primes).
  Total diagonal numbers: $2(3) - 1 = 5$.
  Prime percentage: $\frac{3}{5} = 60\%$.
- For `percent = 60`:
  At $s = 3$, percentage is $60\%$ (not strictly below 60).
  At $s = 5$, corners are 25, 21, 17, 13 (2 new primes: 17, 13).
  Total primes: $3 + 2 = 5$. Total diagonals: $2(5) - 1 = 9$.
  Percentage: $\frac{5}{9} \approx 55.56\% < 60\%$.
  Result: 5.

## Brute force
A naive approach would test all four corners of each ring using trial division. Notice that the bottom-right corner $s^2$ is always a perfect square ($s \ge 3$ is odd and $> 1$), so $s^2$ is never prime. Testing the remaining 3 corners with trial division can be slow if $s^2$ reaches $10^{12}$. Instead, deterministic Miller-Rabin primality testing handles numbers up to $2^{64}$ in logarithmic time.

## The key observation
1. In ring of side $s$, the bottom-right corner is $s^2$, which is never prime.
2. Only the other 3 corners can ever be prime:
   - $s^2 - (s - 1)$
   - $s^2 - 2(s - 1)$
   - $s^2 - 3(s - 1)$
3. Total numbers on diagonals at side $s$ is always $2s - 1$.
4. Avoid floating-point inaccuracies by cross-multiplying:
   $\text{primes} \times 100 < \text{percent} \times (2s - 1)$.
5. Deterministic Miller-Rabin with bases $\{2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37\}$ guarantees 100% correct primality tests for all numbers up to $2^{64}$.

## Optimal approach
1. Implement 64-bit modular exponentiation and multiplication using `__int128` intermediates to prevent overflow.
2. Implement `isPrime(n)` using the deterministic Miller-Rabin test.
3. Initialize `primes = 0`.
4. Loop odd side length $s = 3, 5, 7, \dots$:
   - For $k = 1, 2, 3$:
     - Value $v = s^2 - k(s - 1)$.
     - If `isPrime(v)`, increment `primes++`.
   - Total diagonal numbers is $2s - 1$.
   - If $\text{primes} \times 100 < \text{percent} \times (2s - 1)$:
     - Return $s$.
5. Complexity:
   - Time Complexity: $O(s \cdot \log^2(s^2))$ using Miller-Rabin primality test. For $s \le 30,000$, checking 3 corners per ring runs in ~80 milliseconds.
   - Space Complexity: $O(1)$ auxiliary memory.

## Code walkthrough
- `mulmod(a, b, m)` and `powmod(a, e, m)`: Fast modular arithmetic using `__int128` to avoid 64-bit overflow during modular squaring.
- `static bool isPrime(ull n)`: Deterministic Miller-Rabin testing against standard bases.
- `for (long long s = 3;; s += 2)`: Step through each successive concentric ring with odd side length.
- `for (int k = 1; k <= 3; k++) if (isPrime(...)) primes++;`: Test the 3 potentially prime corners.
- `if (primes * 100 < (long long)percent * (2 * s - 1)) return (int)s;`: Integer comparison avoiding floating-point rounding errors.

## Test it out loud
- Test 1: `percent = 60` $\to$ at $s = 3$, $3/5 = 60\%$ (not $< 60\%$); at $s = 5$, $5/9 \approx 55.5\% < 60\% \to$ returns 5.
- Test 2: `percent = 55` $\to$ reaches $s = 9 \to$ returns 9.
- Test 3: `percent = 40` $\to$ returns 31.
- Test 4: `percent = 30` $\to$ returns 49.

## Follow-ups
- What is the famous Project Euler 58 question?
  Find the side length where the ratio falls below 10%. The answer is $s = 26,241$.
- Why does the proportion of primes decrease as the spiral grows?
  By the Prime Number Theorem, the density of primes near $x$ is approximately $\frac{1}{\ln x}$. As $s$ grows, the numbers on the diagonals grow quadratically ($x \sim s^2$), so the prime density drops like $\frac{1}{2 \ln s}$, inevitably pushing the ratio below any fixed positive threshold.

## Common mistakes
- Testing the fourth corner $s^2$ for primality; $s^2$ is always composite for odd $s \ge 3$, wasting cycles.
- Using floating-point division `(double)primes / total < percent / 100.0`, which is prone to precision rounding errors.
- 32-bit integer overflow when computing $s \times s$.
