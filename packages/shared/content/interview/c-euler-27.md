---
id: c-euler-27
pattern: cses-euler
difficulty: hard
optimal: "O(P * aMax * L * sqrt(V)) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What is the quadratic formula evaluated? $f(n) = n^2 + an + b$, starting at $n = 0, 1, 2, \dots$.
- What constitutes a valid run? The sequence of outputs $f(0), f(1), f(2), \dots, f(L - 1)$ must all be prime numbers (integers strictly greater than 1; numbers $\le 1$ are not prime). The run stops at the first $n$ where $f(n)$ is composite or $\le 1$.
- What are the ranges of $a$ and $b$? $|a| < \text{aMax}$ (so $-(aMax - 1) \le a \le aMax - 1$) and $|b| \le \text{bMax}$.
- What should be returned? The product $a \times b$ of the pair that yields the longest consecutive prime sequence.
- How are ties broken? If two pairs produce identical maximum run lengths, return the pair with the larger product $a \times b$.

## Examples to say out loud
- Consider $aMax = 5, bMax = 5$.
  - At $n = 0$, $f(0) = b$. Therefore $b$ must be a prime number: $b \in \{2, 3, 5\}$.
  - For $b = 5, a = -1$:
    - $n = 0 \to 5$ (prime)
    - $n = 1 \to 1 - 1 + 5 = 5$ (prime)
    - $n = 2 \to 4 - 2 + 5 = 7$ (prime)
    - $n = 3 \to 9 - 3 + 5 = 11$ (prime)
    - $n = 4 \to 16 - 4 + 5 = 17$ (prime)
    - $n = 5 \to 25 - 5 + 5 = 25$ (composite, stops at length 5)
  Product $a \times b = -1 \times 5 = -5$.
- Edge case: $aMax = 2, bMax = 2 \to b = 2, a = -1$ or $1 \to$ returns 0.

## Brute force
A naive brute force iterates over all $a \in [-(aMax - 1), aMax - 1]$ and all $b \in [-bMax, bMax]$, evaluating the quadratic for each $n \ge 0$. With $aMax, bMax \le 2000$, checking $4000 \times 4000 = 1.6 \times 10^7$ pairs without pruning would be excessively slow.

## The key observation
Crucial mathematical pruning reduces the search space dramatically:
1. For $n = 0$, $f(0) = 0^2 + a(0) + b = b$.
   Since $f(0)$ must be prime, $b$ MUST be a positive prime number ($2 \le b \le bMax$).
   Negative $b$ and composite $b$ can be discarded immediately. For $bMax \le 2000$, there are only 303 primes, cutting the search by over 92%.
2. For $n = 1$, $f(1) = 1 + a + b$ must be prime, implying $1 + a + b \ge 2 \implies a \ge 1 - b$.
3. When $b = 2$, $f(1) = 1 + a + 2 = a + 3$. For $a + 3$ to be prime (and thus odd if $> 2$), $a$ must be even. When $b > 2$ is an odd prime, $1 + a + b$ is even unless $a$ is odd.
4. Testing primality up to $\sqrt{v}$ using trial division is sufficient because run lengths $L$ rarely exceed 80.

## Optimal approach
1. Implement a helper function `isPrime(v)` using trial division up to $\sqrt{v}$: returns `false` if $v < 2$, otherwise tests divisibility by $d \ge 2$.
2. Maintain `best_len = -1` and `best_prod = 0`.
3. Loop over all prime numbers $b$ from $2$ to $bMax$:
   - Loop over all integers $a$ from $-(aMax - 1)$ to $aMax - 1$:
     - Initialize $n = 0$.
     - While `isPrime(n * n + a * n + b)` is true, increment $n$.
     - If $n > \text{best\_len}$ or ($n == \text{best\_len}$ and $a \times b > \text{best\_prod}$):
       - Update `best_len = n` and `best_prod = a * b`.
4. Return `best_prod`.
5. Complexity:
   - Time Complexity: $O(P \cdot aMax \cdot L \cdot \sqrt{V})$, where $P$ is the number of primes up to $bMax$ ($\pi(2000) = 303$), $aMax \le 2000$, and average run length $L$ is small ($< 10$ on average). The total runtime is well under 1 second.
   - Space Complexity: $O(1)$ auxiliary space.

## Code walkthrough
- `static bool isPrime(long long v)`: Check if $v \ge 2$ and no divisor up to $\sqrt{v}$ divides $v$.
- `for (int b = 2; b <= bMax; b++) if (!isPrime(b)) continue;`: Prune search to only prime $b$.
- `for (int a = -(aMax - 1); a <= aMax - 1; a++)`: Iterate through the allowed range of coefficient $a$.
- `while (isPrime((long long)n * n + (long long)a * n + b)) n++;`: Advance $n$ as long as the quadratic value remains prime.
- `if (n > bestLen || (n == bestLen && prod > bestProd))`: Update optimal record, adhering to tie-breaking rules.

## Test it out loud
- Test 1: `aMax = 5, bMax = 5` $\to$ returns -5.
- Test 2: `aMax = 10, bMax = 10` $\to$ best run gives product -21.
- Test 3: `aMax = 50, bMax = 100` $\to$ product -1455.
- Test 4: `aMax = 100, bMax = 100` $\to$ product -1455.

## Follow-ups
- Can we speed up the primality checks?
  Yes, precomputing a boolean prime sieve up to $V_{\max} \approx 2000^2 + 2000 \cdot 2000 + 2000 \approx 8 \times 10^6$ gives $O(1)$ primality tests.
- What is Euler's famous quadratic formula?
  $n^2 + n + 41$, which produces 40 consecutive primes for $n = 0, \dots, 39$ (here $a = 1, b = 41$).

## Common mistakes
- Allowing non-prime or negative $b$; since $f(0) = b$, $b$ must be a prime $\ge 2$.
- Strict inequality on $|a| < aMax$: $a$ can range from $-(aMax - 1)$ to $aMax - 1$. Using $\le aMax$ explores an invalid coefficient.
- Forgetting that 1 is NOT prime; `isPrime(1)` must return `false`.
