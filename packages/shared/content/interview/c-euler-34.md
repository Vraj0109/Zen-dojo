---
id: c-euler-34
pattern: cses-euler
difficulty: medium
optimal: "O(cap * digits) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What is a digit factorial number? A number that equals the sum of the factorials of its decimal digits (e.g. $145 = 1! + 4! + 5! = 1 + 24 + 120 = 145$).
- Are single-digit numbers included? No, the problem specifies numbers starting from 10 up to `limit` ($1! = 1$ and $2! = 2$ are excluded).
- What is the value of $0!$? $0! = 1$.
- How large can `limit` be? Up to $10^9$.
- Can any number greater than $7 \times 9! = 2,540,160$ satisfy the condition? No, because an 8-digit number is at least $10^7 = 10,000,000$, whereas the maximum sum of factorials of 8 digits is $8 \times 9! = 8 \times 362,880 = 2,903,040 < 10,000,000$. Hence no solution can have 8 or more digits.

## Examples to say out loud
- Consider $n = 145$.
  Digits are 1, 4, 5.
  Factorials: $1! = 1$, $4! = 24$, $5! = 120$.
  Sum: $1 + 24 + 120 = 145$.
  $145$ equals its digit factorial sum.
- Consider `limit = 100`.
  No numbers between 10 and 100 equal their digit factorial sum $\to$ return 0.
- Consider `limit = 200`.
  145 is within range $[10, 200] \to$ return 145.

## Brute force
A naive approach would iterate from 10 all the way to `limit` ($10^9$). Running $10^9$ iterations would take dozens of seconds and time out. However, our mathematical upper bound proves that no number above $7 \times 9! = 2,540,160$ can ever equal its digit factorial sum, so we can cap our loop upper bound to $\min(\text{limit}, 2540160)$.

## The key observation
Let $k$ be the number of digits of $n$. The minimum value of $n$ is $10^{k-1}$, and the maximum possible sum of factorials is $k \times 9!$.
For $k = 8$: $10^7 = 10,000,000$, but $8 \times 362,880 = 2,903,040$.
Since $10^{k-1} > k \times 9!$ for all $k \ge 8$, every qualifying number must have at most 7 digits and cannot exceed $7 \times 9! = 2,540,160$.
Thus, capping the search at $\text{cap} = \min(\text{limit}, 2540160)$ reduces the iterations from $10^9$ to at most $2.54 \times 10^6$.

## Optimal approach
1. Precompute an array `f[10]` with factorials from $0!$ to $9!$, setting `f[0] = 1`.
2. Determine the effective search cap: `cap = min((long long)limit, 7LL * f[9])`.
3. Initialize accumulator `total = 0`.
4. Loop $n$ from 10 to `cap`:
   - Compute the digit factorial sum:
     - Set `s = 0` and `m = n`.
     - While `m > 0`: `s += f[m % 10]`, `m /= 10`.
   - If `s == n`, add $n$ to `total`.
5. Return `total`.
6. Complexity:
   - Time Complexity: $O(\text{cap} \cdot \log_{10} \text{cap})$, where $\text{cap} \le 2.54 \times 10^6$. The loop runs at most $2.54 \times 10^6$ times with at most 7 digit extractions per number, running in ~30 milliseconds in C++.
   - Space Complexity: $O(1)$, using a fixed 10-element array for factorials.

## Code walkthrough
- `int f[10]; f[0] = 1; for (int i = 1; i < 10; i++) f[i] = f[i - 1] * i;`: Precompute $0!$ through $9!$.
- `int cap = (int)min<long long>(limit, 7LL * f[9]);`: Bound search range to the theoretical maximum.
- `for (int n = 10; n <= cap; n++)`: Start from 10 as single-digit numbers are excluded.
- `while (m) { s += f[m % 10]; m /= 10; }`: Sum factorials of each base-10 digit.
- `if (s == n) total += n;`: Accumulate valid numbers.
- `return (int)total;`: Return total sum.

## Test it out loud
- Test 1: `limit = 10` $\to$ loop runs only for $n = 10$, $1! + 0! = 2 \ne 10 \to$ returns 0.
- Test 2: `limit = 144` $\to$ returns 0.
- Test 3: `limit = 145` $\to 145$ matches $\to$ returns 145.
- Test 4: `limit = 1000` $\to$ returns 145.
- Test 5: In fact, the only two numbers equal to the sum of their digit factorials are 145 and 40585 ($4! + 0! + 5! + 8! + 4! = 40585$).

## Follow-ups
- What are all the factorions in base 10?
  There are only four factorions in base 10: 1, 2, 145, and 40585. Since 1 and 2 are excluded as single digits, only 145 and 40585 exist.
- What if base $B$ is different from 10?
  The same logic applies: find $k$ such that $B^{k-1} > k \times (B - 1)!$, capping the search range, and precompute factorials in base $B$.

## Common mistakes
- Running the loop up to `limit` without capping at $7 \times 9!$, causing TLE when `limit = 10^9`.
- Forgetting that $0! = 1$ (e.g. setting `f[0] = 0`), which causes digits containing zero (like in 40585) to compute incorrect sums.
- Starting from $n = 1$ or $n = 0$ instead of $n = 10$, improperly including single digits.
