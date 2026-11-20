---
id: c-kattis-pot
pattern: cses-kattis
difficulty: easy
optimal: "O(n * 9) time, O(1) space"
reviewed: false
---

## Clarify first

- How is each input number formatted? (Each integer in `nums` encodes a base and an exponent: its last digit is the exponent, and the remaining leading digits form the base).
- How do we separate base and exponent? (For a number $x$: exponent is $x \bmod 10$, base is $\lfloor x / 10 \rfloor$; for example, $212 \implies \text{base } 21, \text{exp } 2$).
- What are the constraints on the input array and values? (`1 <= nums.length <= 100`, $10 \le nums[i] \le 309$, meaning base is between 1 and 30, and exponent is between 0 and 9).
- Can the total sum exceed standard 32-bit signed integers? (Yes: the maximum single term is $30^9 \approx 1.97 \times 10^{13}$, which exceeds $2^{31} - 1$ and requires a 64-bit integer type like `long long` in C++ or `long` in Java).
- What should be returned? (A 64-bit integer representing the sum of all evaluated powers: $\sum (\text{base}_i)^{\text{exp}_i}$).

## Examples to say out loud

- Standard case: `nums = [24, 31]`.
  - Number 24: base $= 24 / 10 = 2$, exp $= 24 \% 10 = 4$. $2^4 = 16$.
  - Number 31: base $= 31 / 10 = 3$, exp $= 31 \% 10 = 1$. $3^1 = 3$.
  - Total sum: $16 + 3 = 19$. Output is 19.
- Large powers: `nums = [212, 305]`.
  - 212: $21^2 = 441$.
  - 305: $30^5 = 24,300,000$.
  - Total sum: $441 + 24,300,000 = 24,300,441$. Output is 24300441.
- Exponent zero: `nums = [10]`.
  - Base 1, exp 0: $1^0 = 1$. Output is 1.

## Brute force

A direct simulation iterates through each number $x$ in `nums`, extracts base $= x / 10$ and exp $= x \bmod 10$, computes $\text{base}^{\text{exp}}$ using repeated multiplication or fast exponentiation, and accumulates the result into a 64-bit integer. Because the exponent is at most 9 and there are at most 100 numbers, this requires at most $100 \times 9 = 900$ multiplications, which executes in a fraction of a millisecond.

## The key observation

The encoding is based on standard decimal digit positioning: the units place $x \bmod 10$ gives the power, and the truncated integer $x / 10$ gives the base. Because $\text{exp} \le 9$, computing $\text{base}^{\text{exp}}$ by simple repeated multiplication or binary exponentiation is bounded by at most 9 steps per element. Accumulating the powers into a 64-bit integer prevents overflow up to $100 \times 30^9 \approx 2 \times 10^{15}$.

## Optimal approach

1. Initialize a 64-bit accumulator `total = 0`.
2. For each number `x` in `nums`:
   a. Extract exponent: `exp = x % 10`.
   b. Extract base: `base = x / 10`.
   c. Compute `p = base^exp` using a loop of size `exp` or standard exponentiation with 64-bit integers.
   d. Add `p` to `total`.
3. Return `total`.

Complexity:
- Time: `O(n * 9)` time where $n$ is the length of `nums`. Each power takes at most 9 multiplications, totaling at most 900 operations.
- Space: `O(1)` auxiliary space as only scalar integer variables are allocated.

## Code walkthrough

In the reference implementation:
- `long long total = 0;`: prevents 32-bit integer overflow by holding 64-bit sums up to $2 \times 10^{15}$.
- `for (int x : nums)`: iterates sequentially over each encoded integer.
- `long long p = 1; for (int i = 0; i < x % 10; i++) p *= x / 10;`: computes $(\lfloor x / 10 \rfloor)^{x \bmod 10}$ iteratively using 64-bit multiplication.
- `total += p;`: accumulates each term into the running total.
- `return total;`: returns the total sum.

## Test it out loud

- `nums = [10]`:
  - Base 1, exp 0: loop runs 0 times, `p = 1`. `total = 1`. Returns 1.
- `nums = [20]`:
  - Base 2, exp 0: $2^0 = 1$. Returns 1.
- `nums = [309]`:
  - Base 30, exp 9: $30^9 = 19,683,000,000,000$. Returns 19683000000000.
- `nums = [21, 22, 23, 24, 25]`:
  - All bases are 2, exponents are 1, 2, 3, 4, 5.
  - $2^1 + 2^2 + 2^3 + 2^4 + 2^5 = 2 + 4 + 8 + 16 + 32 = 62$. Returns 62.

## Follow-ups

- What if exponents were up to $10^9$?
  We would use modular binary exponentiation (`pow(base, exp, mod)`) in $O(\log \text{exp})$ time to evaluate huge powers without overflow.
- What if numbers are provided as strings instead of integers?
  The last character of the string represents the exponent (`str.back() - '0'`), and the substring omitting the last character is parsed into the base integer.

## Common mistakes

- Using 32-bit signed integers for `total` or `p`: $30^9 = 1.96 \times 10^{13} > 2^{31} - 1$, causing integer overflow and negative output.
- Using floating-point `pow(base, exp)` without rounding: floating-point precision can introduce off-by-one errors on large integers like $30^9$.
- Off-by-one errors when separating the base and exponent (e.g. converting to string and splitting incorrectly).

## Further reading

- Fast exponentiation algorithms (binary exponentiation).
- Precision limitations of standard double-precision floating-point arithmetic.
