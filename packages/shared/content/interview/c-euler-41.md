---
id: c-euler-41
pattern: cses-euler
difficulty: medium
optimal: "O(n! * sqrt(10^n)) time, O(n) space"
reviewed: false
---

## Clarify first
- What defines an $n$-digit pandigital number? A number with $n$ digits that uses each digit from $1$ to $n$ exactly once (e.g. for $n = 4$, digits 1, 2, 3, 4).
- What should be returned? The largest prime number that is an $n$-digit pandigital number, or 0 if no such prime exists.
- What is the range of $n$? $1 \le n \le 9$.
- Can we check permutations in decreasing order? Yes, starting from the largest arrangement $[n, n-1, \dots, 1]$ and stepping backwards stops immediately at the largest prime.

## Examples to say out loud
- Consider $n = 4$.
  Pandigital digits are 1, 2, 3, 4.
  The permutations in decreasing order begin: 4321, 4312, 4231...
  - 4321: $4+3+2+1 = 10$, not divisible by 3, but $4321 = 29 \times 149$ (composite).
  - 4312: ends in 2, even (composite).
  - 4231: prime.
  Result: 4231.
- Consider $n = 2$.
  Only 21 and 12 exist. $21 = 3 \times 7$ and $12 = 3 \times 4$. Neither is prime $\to$ return 0.
- Consider $n = 1$.
  Only 1 exists, and 1 is not prime $\to$ return 0.

## Brute force
Generating all $n!$ permutations (at most $9! = 362,880$) and checking primality using trial division takes at most $O(n! \sqrt{10^n})$. However, an important mathematical rule lets us prune $n = 8$ and $n = 9$ instantly without checking any permutations.

## The key observation
Recall the divisibility rule for 3: a number is divisible by 3 if and only if the sum of its decimal digits is divisible by 3.
The sum of digits $1$ to $n$ is $\frac{n(n + 1)}{2}$:
- For $n = 9$: sum is $\frac{9 \times 10}{2} = 45$, divisible by 3.
- For $n = 8$: sum is $\frac{8 \times 9}{2} = 36$, divisible by 3.
- For $n = 6$: sum is $\frac{6 \times 7}{2} = 21$, divisible by 3.
- For $n = 5$: sum is $\frac{5 \times 6}{2} = 15$, divisible by 3.
- For $n = 3$: sum is $\frac{3 \times 4}{2} = 6$, divisible by 3.
- For $n = 2$: sum is 3, divisible by 3.
Every permutation of digits for $n \in \{2, 3, 5, 6, 8, 9\}$ is strictly greater than 3 and divisible by 3, so NONE can ever be prime.
Only $n = 4$ (sum 10) and $n = 7$ (sum 28) can possibly yield primes.
For $n = 4$ or $n = 7$, iterating permutations in lexicographically decreasing order finds the maximum prime almost immediately.

## Optimal approach
1. If $n = 8$ or $n = 9$ (or more generally if $\frac{n(n+1)}{2} \pmod 3 == 0$ and $n > 3$), return 0 immediately.
2. Initialize string $s$ with digits in descending order: `s = string(n)` where digits are $n, n-1, \dots, 1$.
3. Loop through permutations in descending order using `prev_permutation`:
   - Parse $s$ into integer $v$.
   - Check if $v$ is prime using trial division up to $\sqrt{v}$.
   - If prime, return $v$ immediately.
4. If no permutation is prime, return 0.
5. Complexity:
   - Time Complexity: $O(n! \cdot \sqrt{10^n})$ worst-case. For $n = 4$, only 3 permutations are checked. For $n = 7$, the first prime appears after checking only a few hundred permutations. Runtime is under 2 milliseconds.
   - Space Complexity: $O(n)$ space to store the permutation string.

## Code walkthrough
- `static bool isPrime(int v)`: Standard $O(\sqrt{v})$ trial division primality tester.
- `if (n == 8 || n == 9) return 0;`: Quick mathematical shortcut for numbers always divisible by 3.
- `for (int d = n; d >= 1; d--) s += char('0' + d);`: Construct largest pandigital permutation.
- `do { int v = stoi(s); if (isPrime(v)) return v; } while (prev_permutation(...));`: Decrementally search permutations, returning the first prime hit.
- `return 0;`: Fallback if no prime exists.

## Test it out loud
- Test 1: $n = 1 \to$ value 1 is not prime $\to$ returns 0.
- Test 2: $n = 2 \to$ values 21, 12 divisible by 3 $\to$ returns 0.
- Test 3: $n = 3 \to$ sum of digits 6 $\to$ returns 0.
- Test 4: $n = 4 \to$ checks 4321 (composite), 4312 (even), 4231 (prime) $\to$ returns 4231.
- Test 5: $n = 7 \to$ returns 7652413.

## Follow-ups
- What is the largest pandigital prime of ANY length?
  Because $n = 8$ and $n = 9$ are always multiples of 3, the largest pandigital prime across all lengths $1 \le n \le 9$ is the largest 7-digit pandigital prime: 7652413.
- How would you test primes if $n$ could be up to 15?
  Trial division would be too slow; we would use the deterministic Miller-Rabin primality test.

## Common mistakes
- Generating permutations in ascending order, which requires generating all $n!$ candidates to find the maximum rather than stopping at the first match.
- Forgetting that 1 is not prime, returning 1 when $n = 1$.
- Neglecting the divisibility by 3 rule and wasting time scanning through all 362,880 permutations of 9 digits.
