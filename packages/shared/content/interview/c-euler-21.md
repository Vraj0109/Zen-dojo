---
id: c-euler-21
pattern: cses-euler
difficulty: medium
optimal: "O(n log n) time (the sieve), O(n) space"
brute: same
reviewed: false
---

## Clarify first

- What is a proper divisor? (A proper divisor of $n$ is any positive divisor of $n$ strictly smaller than $n$, so 1 is included, but $n$ itself is not; for example, proper divisors of 12 are 1, 2, 3, 4, 6, with sum $d(12) = 16$).
- What defines an amicable number? (Two distinct positive integers $a \ne b$ are amicable if $d(a) = b$ and $d(b) = a$).
- What condition determines if an amicable number is included in the sum? (The number $a$ must be strictly below `limit`, AND its amicable partner $b$ must also be strictly below `limit`: $a < \text{limit}$, $b < \text{limit}$, $a \ne b$, and $d(d(a)) = a$).
- What are the constraints on `limit`? ($1 \le \text{limit} \le 1,000,000$).
- What should be returned? (The sum of all qualifying amicable numbers $a$, accumulating into a 64-bit integer).

## Examples to say out loud

- First amicable pair: $a = 220, b = 284$.
  - Proper divisors of 220: 1, 2, 4, 5, 10, 11, 20, 22, 44, 55, 110 $\implies$ sum is 284.
  - Proper divisors of 284: 1, 2, 4, 71, 142 $\implies$ sum is 220.
  - Since $220 \ne 284$ and $d(220) = 284, d(284) = 220$, both are amicable numbers.
  - If `limit = 300`: both 220 and 284 are below 300. The sum is $220 + 284 = 504$. Output is 504.
- Below first pair: `limit = 200`. No amicable numbers exist below 220. Output is 0.
- One partner excluded: `limit = 221`. 220 is below 221, but its partner 284 is $\ge 221$. The problem specifies both partners must be below limit, so 220 is not counted. Output is 0.

## Brute force

A brute-force strategy computes $d(x)$ for each number individually using trial division up to $\sqrt{x}$. For $n = 1,000,000$, performing trial division across one million numbers requires $\sum_{x=1}^{10^6} O(\sqrt{x}) \approx \frac{2}{3} \times (10^6)^{1.5} \approx 6.7 \times 10^8$ operations, which takes several seconds.

## The key observation

Instead of finding divisors for each number separately, we can compute the sum of proper divisors for all numbers simultaneously using a sieve of Eratosthenes approach.
Every integer $i$ is a proper divisor of all its proper multiples $2i, 3i, 4i, \dots$.
By allocating an array $d$ of size `limit` initialized to 0, we iterate $i$ from 1 to $\text{limit} - 1$, and add $i$ to $d[j]$ for all $j = 2i, 3i, \dots < \text{limit}$.
This sieve runs in harmonic series time:
$$\sum_{i=1}^{\text{limit}} \frac{\text{limit}}{i} = O(\text{limit} \log \text{limit})$$
Once $d$ is precomputed, checking each $a$ takes $O(1)$ lookup: let $b = d[a]$; if $b \ne a$, $b < \text{limit}$, and $d[b] == a$, then $a$ is amicable.

## Optimal approach

1. Allocate an array `d` of size `limit + 1` initialized to 0.
2. Run a divisor sieve to populate proper divisor sums:
   - For $i$ from 1 to `limit - 1`:
     - For $j = 2i$ step $i$ while $j < \text{limit}$:
       - Add `d[j] += i`.
3. Initialize a 64-bit accumulator `total = 0`.
4. For each $a$ from 1 to `limit - 1`:
   - Let $b = d[a]$.
   - Check if $b \ne a$, $b < \text{limit}$, and $d[b] == a$.
   - If all conditions hold, add $a$ to `total`.
5. Return `total`.

Complexity:
- Time: `O(n log n)` where $n = \text{limit}$. The divisor sieve runs in $\sum_{i=1}^n \frac{n}{i} \approx n \ln n$ operations. For $n = 10^6$, $n \ln n \approx 1.4 \times 10^7$ additions, finishing in ~35 ms.
- Space: `O(n)` auxiliary space for the `d` array of size $1,000,001$ integers (~4 MB).

## Code walkthrough

In the reference implementation:
- `vector<int> d(limit + 1, 0);`: preallocates the divisor sum table.
- `for (int i = 1; i < limit; i++) for (int j = 2 * i; j < limit; j += i) d[j] += i;`: distributes $i$ as a proper divisor to its multiples, skipping $1 \times i$ so $j$ does not include itself.
- `long long total = 0;`: accumulates the amicable sum in 64-bit precision.
- `int b = d[a]; if (b != a && b < limit && d[b] == a) total += a;`: checks that $a$ is not a perfect number ($b \ne a$), that partner $b$ is strictly within the limit ($b < \text{limit}$), and that reciprocity holds ($d[b] == a$).

## Test it out loud

- `limit = 1` or `limit = 200`:
  - No pairs satisfy all conditions. Returns 0.
- `limit = 221`:
  - $a = 220 \implies b = 284$. But $b = 284 < 221$ is false. Not added. Returns 0.
- `limit = 285`:
  - $a = 220 \implies b = 284 < 285$ and $d[284] == 220$. Adds 220.
  - $a = 284 \implies b = 220 < 285$ and $d[220] == 284$. Adds 284.
  - Total is $220 + 284 = 504$. Returns 504.

## Follow-ups

- What if $b$ is allowed to be $\ge \text{limit}$ (only $a < \text{limit}$ required)?
  Some problem variants count any amicable number $a < \text{limit}$ even if its partner $b$ exceeds `limit`. If so, we must size the sieve up to the maximum possible divisor sum (around $3 \times \text{limit}$) or compute $d(b)$ on-the-fly for $b \ge \text{limit}$.
- What happens if $a == b$?
  Numbers where $d(a) == a$ are called perfect numbers (such as 6, 28, 496). The condition $a \ne b$ explicitly excludes perfect numbers from being counted as amicable pairs.

## Common mistakes

- Including perfect numbers ($a == b$, such as 6 or 28) by omitting the condition `b != a`.
- Out-of-bounds array access when querying $d[b]$: $b = d[a]$ can be larger than `limit` (e.g., $d(999999)$ could exceed $10^6$), so checking `b < limit` before indexing `d[b]` is mandatory.
- Counting both $a$ and $b$ inside the same iteration and causing duplicate addition. The loop adds $a$ on its turn and $b$ on its turn naturally.

## Further reading

- Aliquot sequences and amicable numbers.
- Harmonic series and divisor sieve complexity analysis.
