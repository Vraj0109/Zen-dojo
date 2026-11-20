---
id: c-euler-25
pattern: cses-euler
difficulty: medium
optimal: "O(d^2) time, O(d) space"
reviewed: false
---

## Clarify first
- What is the Fibonacci indexing convention used? $F_1 = 1$, $F_2 = 1$, $F_3 = 2$, $F_4 = 3$, $F_5 = 5$, and so forth ($F_k = F_{k-1} + F_{k-2}$).
- What is being asked? Find the smallest 1-based index $k$ such that the Fibonacci number $F_k$ contains at least $d$ decimal digits.
- What are the constraints on $d$? $1 \le d \le 2000$.
- What should be returned for $d = 1$? $F_1 = 1$ has 1 digit, so the answer is 1.
- Why can't we use 64-bit primitive types? A 64-bit integer overflows at $F_{93}$, which has only 20 digits. For $d \le 2000$, we need arbitrary-precision addition.

## Examples to say out loud
- Consider $d = 1$.
  $F_1 = 1$ has 1 digit $\to$ return 1.
- Consider $d = 2$.
  - $F_1 = 1$ (1 digit)
  - $F_2 = 1$ (1 digit)
  - $F_3 = 2$ (1 digit)
  - $F_4 = 3$ (1 digit)
  - $F_5 = 5$ (1 digit)
  - $F_6 = 8$ (1 digit)
  - $F_7 = 13$ (2 digits)
  $F_7$ is the first term with at least 2 digits $\to$ return 7.
- Consider $d = 3$.
  $F_{12} = 144$ (3 digits) $\to$ return 12.

## Brute force
Binet's formula provides an approximation: $F_k \approx \frac{\phi^k}{\sqrt{5}}$, where $\phi = \frac{1 + \sqrt{5}}{2} \approx 1.6180339887$. Taking base-10 logarithms: $\log_{10}(F_k) \approx k \log_{10}(\phi) - \frac{1}{2}\log_{10}(5)$. While a closed-form logarithmic formula can estimate $k$, an interviewer will expect arbitrary-precision arithmetic simulation or a discussion of exact precision. Simulating the addition digit-by-digit guarantees exact correctness without floating-point inaccuracy.

## The key observation
By the golden ratio growth rate, the number of decimal digits in $F_k$ grows linearly: $k \approx 4.78 \times d$.
For $d = 2000$, the index $k$ reaches approximately $4.78 \times 2000 \approx 9560$.
Simulating big-integer addition for 9,560 steps where each addition operates on vectors of size at most $2000$ takes approximately $\frac{9560 \times 2000}{2} \approx 9.5 \times 10^6$ operations, which takes less than 30 milliseconds.

## Optimal approach
1. Handle base case: if $d \le 1$, return 1 immediately.
2. Maintain two vectors of digits (least significant digit first):
   - `a = [1]` (representing $F_1$)
   - `b = [1]` (representing $F_2$)
3. Initialize index counter `k = 2`.
4. While the length of `b` (number of digits in $F_k$) is strictly less than $d$:
   - Compute `c = a + b` using schoolbook addition with carry:
     - For index $i$ from 0 to $|b| - 1$:
       - `sum = b[i] + (i < |a| ? a[i] : 0) + carry`
       - Append `sum % 10` to `c`
       - Update `carry = sum / 10`
     - If `carry > 0`, append `carry` to `c`.
   - Advance: set `a = b`, `b = c`.
   - Increment `k` by 1.
5. Return `k`.
6. Complexity:
   - Time Complexity: $O(d^2)$, where $d$ is the number of digits. The number of terms evaluated is $O(d)$, and each big-integer addition takes $O(d)$ time.
   - Space Complexity: $O(d)$ to store the digits of the two consecutive Fibonacci numbers.

## Code walkthrough
- `if (d <= 1) return 1;`: Edge case for single-digit requirement.
- `vector<int> a{1}, b{1}; int k = 2;`: Base values $F_1 = 1, F_2 = 1$ at index 2.
- `while ((int)b.size() < d)`: Continue until the current term $b$ has at least $d$ digits.
- `int s = b[i] + (i < a.size() ? a[i] : 0) + carry;`: Column-wise decimal addition with carry.
- `a = b; b = c; k++;`: Shift terms forward to the next Fibonacci number.
- `return k;`: Return the 1-based index.

## Test it out loud
- Test 1: $d = 1 \to$ returns 1.
- Test 2: $d = 2 \to$ traces up to $F_7 = 13 \to$ returns 7.
- Test 3: $d = 3 \to$ traces up to $F_{12} = 144 \to$ returns 12.
- Test 4: $d = 4 \to$ traces up to $F_{17} = 1597 \to$ returns 17.

## Follow-ups
- Can we solve this in $O(1)$ time with high precision floating-point math?
  Yes, using Binet's formula: we want $F_k \ge 10^{d-1}$.
  $k \cdot \log_{10}(\phi) - \frac{\log_{10}(5)}{2} \ge d - 1$.
  Solving for $k$: $k = \lceil \frac{d - 1 + \log_{10}(\sqrt{5})}{\log_{10}(\phi)} \rceil$.
  For $d \le 2000$, standard 64-bit IEEE 754 `double` has 53 bits of precision (~15-17 decimal digits), which can suffer subtle rounding issues for very large $d$. The big-int simulation is guaranteed exact.
- How would you optimize the big integer simulation?
  Store base $10^9$ chunks instead of base 10 digits to reduce additions and allocations by a factor of 9.

## Common mistakes
- 0-based versus 1-based indexing confusion: the problem states $F_1 = 1, F_2 = 1$, so $F_3 = 2$, not $F_2 = 2$.
- Returning 2 for $d = 1$ instead of 1 ($F_1 = 1$ already satisfies having 1 digit).
- Storing digits in most-significant-first order, which makes carrying and appending digits inefficient ($O(n)$ shifts).
