---
id: c-cf-486a
pattern: cses-codeforces
difficulty: easy
optimal: "O(1) time, O(1) space"
reviewed: false
---

## Clarify first
- What is the function $f(n)$ being computed?
  $f(n) = -1 + 2 - 3 + 4 - 5 + \dots + (-1)^n \cdot n$.
  The terms alternate in sign: negative for odd integers, positive for even integers.
- What is the range of $n$? $1 \le n \le 10^{15}$.
- What should be returned? The exact value of $f(n)$ as a 64-bit signed integer.
- Why can't we use a loop? For $n \le 10^{15}$, an $O(n)$ loop performing $10^{15}$ operations would take months to run. We must derive an $O(1)$ closed-form mathematical formula.

## Examples to say out loud
- Consider $n = 4$.
  $f(4) = -1 + 2 - 3 + 4$.
  Group into pairs: $(-1 + 2) + (-3 + 4) = 1 + 1 = 2$.
  Notice $4 / 2 = 2$.
  Result: 2.
- Consider $n = 5$.
  $f(5) = f(4) - 5 = 2 - 5 = -3$.
  Notice $-(5 + 1) / 2 = -6 / 2 = -3$.
  Result: -3.
- Consider $n = 1$.
  $f(1) = -1$.
  Formula gives $-(1 + 1) / 2 = -1$.
- Consider $n = 2$.
  $f(2) = -1 + 2 = 1$.
  Formula gives $2 / 2 = 1$.

## Brute force
A simulation approach loops from $i = 1$ to $n$, adding $i$ if $i$ is even and subtracting $i$ if $i$ is odd. This takes $O(n)$ time, which results in Time Limit Exceeded for $n > 10^8$. Grouping adjacent terms mathematically resolves the entire sum in $O(1)$ operations.

## The key observation
Consider grouping adjacent pairs of terms starting from 1:
$(-1 + 2) + (-3 + 4) + (-5 + 6) + \dots$
Notice that each pair contributes exactly $+1$:
$-1 + 2 = 1$
$-3 + 4 = 1$
$-(2k - 1) + 2k = 1$
- If $n$ is even ($n = 2k$):
  There are exactly $n / 2$ complete pairs, each summing to $+1$.
  $f(n) = \frac{n}{2}$.
- If $n$ is odd ($n = 2k + 1$):
  The sum of the first $n - 1$ terms (which is even) is $\frac{n - 1}{2}$.
  The final term is $-n$.
  $f(n) = \frac{n - 1}{2} - n = \frac{n - 1 - 2n}{2} = -\frac{n + 1}{2}$.
Both cases evaluate in a single constant-time arithmetic statement using 64-bit signed integers.

## Optimal approach
1. Inspect the parity of $n$:
   - If $n$ is even ($n \pmod 2 == 0$): return $n / 2$.
   - If $n$ is odd ($n \pmod 2 \ne 0$): return $-(n + 1) / 2$.
2. Complexity:
   - Time Complexity: $O(1)$, one modulo check and one division.
   - Space Complexity: $O(1)$, requiring no extra storage.

## Code walkthrough
- `long long evalCalculatingFunction(long long n)`: Function accepting 64-bit integer $n$.
- `if (n % 2 == 0) return n / 2;`: When $n$ is even, pairs sum to $+n/2$.
- `return -((n + 1) / 2);`: When $n$ is odd, the trailing negative term dominates, yielding $-(n+1)/2$.

## Test it out loud
- Test 1: $n = 1 \to -(1 + 1) / 2 = -1$.
- Test 2: $n = 2 \to 2 / 2 = 1$.
- Test 3: $n = 7 \to -(7 + 1) / 2 = -4$.
- Test 4: $n = 1000000000000 \to 500000000000$.
- Test 5: $n = 1000000000001 \to -500000000001$.

## Follow-ups
- Can this be written branchlessly?
  Yes, using the sign of $(-1)^n$:
  Notice that $n \pmod 2$ is 0 for even and 1 for odd.
  $f(n) = (n \% 2 == 0) ? (n / 2) : -((n + 1) / 2)$.
- What if the signs were reversed: $+1 - 2 + 3 - 4 \dots$?
  The sum would be exactly $-f(n)$: $-n / 2$ for even $n$, and $(n + 1) / 2$ for odd $n$.

## Common mistakes
- Using 32-bit signed integers: $n$ reaches $10^{15}$, which exceeds $2^{31} - 1 \approx 2 \times 10^9$, causing integer overflow. `long long` in C++ or `long` in Java is mandatory.
- Using a loop that attempts to simulate $10^{15}$ steps.
- Missing parentheses in `-((n + 1) / 2)` (e.g. writing `-(n + 1 / 2)`).
