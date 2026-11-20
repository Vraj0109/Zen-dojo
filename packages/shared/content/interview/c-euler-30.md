---
id: c-euler-30
pattern: cses-euler
difficulty: medium
optimal: "O(limit * digits) time, O(1) space"
reviewed: false
---

## Clarify first
- What is a digit power sum? Given a power $p$, the digit power sum of a number $n$ is the sum of each of its decimal digits raised to the power $p$.
- What numbers qualify? Numbers $n \ge 10$ (at least two digits) that equal their own digit power sum: $n = \sum d_i^p$. Single-digit numbers like $1 = 1^p$ are explicitly excluded.
- What should be returned? The sum of all qualifying numbers for the given power $p$.
- What is the range of $p$? $2 \le p \le 7$.
- How do we know the search terminates? A $k$-digit number is at least $10^{k-1}$, but the maximum possible digit power sum is $k \times 9^p$. Once $10^{k-1} > k \times 9^p$, no number with $k$ or more digits can equal its digit power sum.

## Examples to say out loud
- Consider $p = 3$.
  $153 = 1^3 + 5^3 + 3^3 = 1 + 125 + 27 = 153$.
  $370 = 3^3 + 7^3 + 0^3 = 27 + 343 + 0 = 370$.
  $371 = 3^3 + 7^3 + 1^3 = 27 + 343 + 1 = 371$.
  $407 = 4^3 + 0^3 + 7^3 = 64 + 0 + 343 = 407$.
  Sum of all such numbers: $153 + 370 + 371 + 407 = 1301$.
- Consider $p = 2$.
  No number with $\ge 2$ digits equals the sum of squares of its digits.
  Result: 0.

## Brute force
Without determining an upper bound, a naive search might loop indefinitely. By deriving an upper bound on the maximum number of digits, we transform an ostensibly unbounded problem into a finite search over integers up to $(p + 1) \times 9^p$.

## The key observation
Let $k$ be the number of digits in $n$.
The minimum value of a $k$-digit number is $10^{k-1}$.
The maximum possible sum of the $p$-th powers of its digits is $k \times 9^p$.
For $k = p + 2$, $10^{k-1} > k \times 9^p$, which means no solution can have more than $p + 1$ digits.
A safe and rigorous upper bound is $\text{limit} = (p + 1) \times 9^p$.
For $p = 5$, $\text{limit} = 6 \times 9^5 = 354,294$.
For $p = 7$, $\text{limit} = 8 \times 9^7 \approx 3.8 \times 10^7$.
Precomputing $d^p$ for digits $0 \le d \le 9$ allows evaluating each number in a few operations.

## Optimal approach
1. Precompute an array `pw[10]` where `pw[d] = d^p` for $0 \le d \le 9$.
2. Compute the search upper bound: `limit = (p + 1) * pw[9]`.
3. Initialize accumulator `total = 0`.
4. Loop integer $n$ from $10$ to `limit`:
   - Compute the digit power sum $s$:
     - Set $s = 0$ and $m = n$.
     - While $m > 0$: add `pw[m % 10]` to $s$, then $m /= 10$.
   - If $s == n$, add $n$ to `total`.
5. Return `total`.
6. Complexity:
   - Time Complexity: $O(\text{limit} \cdot \log_{10} \text{limit})$, where $\text{limit} = (p + 1) 9^p$. For $p = 5$, limit $\approx 3.5 \times 10^5$ (instantaneous); for $p = 7$, $\approx 3.8 \times 10^7$ iterations, executing in ~0.5s in C++.
   - Space Complexity: $O(1)$, using a fixed array of size 10 for digit powers.

## Code walkthrough
- `long long pw[10];`: Precomputed power lookup table.
- `for (int d = 0; d < 10; d++) ...`: Calculate $d^p$ for each digit $0..9$.
- `long long limit = (long long)(p + 1) * pw[9];`: Mathematical upper bound beyond which $n > \sum d_i^p$.
- `for (long long n = 10; n <= limit; n++)`: Start search at 10 to exclude single-digit numbers.
- `while (m) { s += pw[m % 10]; m /= 10; }`: Calculate digit power sum in $O(\text{digits})$ operations.
- `if (s == n) total += n;`: Accumulate matches.

## Test it out loud
- Test 1: $p = 2 \to$ search limit $= 3 \times 81 = 243 \to$ no matches $\to$ returns 0.
- Test 2: $p = 3 \to$ matches 153, 370, 371, 407 $\to$ returns 1301.
- Test 3: $p = 4 \to$ returns 19316 (1634, 8208, 9474).
- Test 4: $p = 5 \to$ returns 443839.

## Follow-ups
- Can we optimize further for larger $p$?
  Yes, using digit combinations with replacement (`multisets` of digits): since the order of digits does not change their power sum, we can iterate over combinations of digits, compute their sum $S$, and verify if the digits of $S$ match the multiset. This reduces the search from $10^7$ numbers to $\binom{10 + k - 1}{k}$ combinations (under 20,000 checks).
- Why are numbers like $1 = 1^p$ omitted?
  The problem definition specifies numbers that can be written as the sum of powers of their digits, explicitly stating they must have at least two digits.

## Common mistakes
- Including 1 in the sum (e.g. starting loop at $n = 1$ instead of $n = 10$).
- Arbitrary guess for the upper limit (e.g. stopping at 100,000 or $1,000,000$), missing valid numbers for larger powers $p$.
- Computing `pow(d, p)` using floating-point `std::pow` inside the inner loop, which is both slow and prone to precision truncation.
