---
id: c-euler-36
pattern: cses-euler
difficulty: medium
optimal: "O(H * log(limit)) time, O(log(limit)) space"
reviewed: false
---

## Clarify first
- What makes a number a double-base palindrome? The number must be a palindrome in base 10 AND a palindrome in the specified `base`.
- Are leading zeros allowed in either base? No, neither representation may have leading zeros. (This is naturally satisfied for positive integers whose least significant digit is non-zero).
- What is the range of `limit` and `base`? $1 \le \text{limit} \le 10^9$ and $2 \le \text{base} \le 16$.
- Is the limit inclusive or exclusive? Strictly below `limit` ($< \text{limit}$).
- What should be returned? The sum of all qualifying numbers.

## Examples to say out loud
- Consider `limit = 10` and `base = 2`.
  - In base 10, single-digit numbers 1, 3, 5, 7, 9 are palindromic.
  - In base 2:
    - $1_{10} = 1_2$ (palindrome)
    - $3_{10} = 11_2$ (palindrome)
    - $5_{10} = 101_2$ (palindrome)
    - $7_{10} = 111_2$ (palindrome)
    - $9_{10} = 1001_2$ (palindrome)
  All five are palindromes in both bases.
  Sum: $1 + 3 + 5 + 7 + 9 = 25$.
- Edge case: `limit = 1, base = 2` $\to$ no positive integers $< 1 \to$ returns 0.

## Brute force
A brute force approach tests every integer $x$ from $1$ to $\text{limit} - 1$ for palindromicity in base 10 and then in `base`. Because $\text{limit} \le 10^9$, scanning $10^9$ numbers takes tens of seconds and times out. Instead of checking all numbers, we should generate base-10 palindromes directly.

## The key observation
Every base-10 palindrome is uniquely determined by its first half.
A number $< 10^9$ has at most 9 digits. Its first half has at most 5 digits.
- Odd-length palindrome: half $h$ generates $h$ followed by the reverse of $\lfloor h / 10 \rfloor$.
  E.g. $h = 123 \to 12321$.
- Even-length palindrome: half $h$ generates $h$ followed by the reverse of $h$.
  E.g. $h = 123 \to 123321$.
By looping $h$ from 1 to $99,999$, we generate every base-10 palindrome $< 10^9$ exactly once. There are only about $2 \times 10^5$ such palindromes. Testing each in `base` takes $O(\log_{\text{base}} v)$ steps, making the entire search run in ~50 milliseconds.

## Optimal approach
1. Define a helper `isPalindromeBase(v, base)`:
   - Extract digits of $v$ in `base` into a list: `v % base`, `v /= base`.
   - Verify if the list equals its reverse.
2. Initialize `total = 0`.
3. Loop half $h$ from 1 to 99,999:
   - Generate odd-length palindrome:
     - `v = h`, `t = h / 10`.
     - While $t > 0$: `v = v * 10 + t % 10`, `t /= 10`.
     - If $v < \text{limit}$ and `isPalindromeBase(v, base)`: `total += v`.
   - Generate even-length palindrome:
     - `v = h`, `t = h`.
     - While $t > 0$: `v = v * 10 + t % 10`, `t /= 10`.
     - If $v < \text{limit}$ and `isPalindromeBase(v, base)`: `total += v`.
4. Return `total` (as a 64-bit integer).
5. Complexity:
   - Time Complexity: $O(H \cdot \log(\text{limit}))$, where $H \approx 10^5$ halves. Checking each palindrome in `base` takes $O(\log_{\text{base}} v) \le 30$ operations. Total operations $\approx 6 \times 10^6$.
   - Space Complexity: $O(\log_{\text{base}} v)$ space to store digits for the base conversion check.

## Code walkthrough
- `static bool pal(long long v, int base)`: Extract digits in `base` and check two-pointer palindrome match.
- `for (long long h = 1; h <= 99999; h++)`: Enumerate all first halves up to 5 digits.
- `for (int odd = 0; odd < 2; odd++)`: Construct both odd-length and even-length palindromes from $h$.
- `long long v = h, t = odd ? h / 10 : h; while (t) { v = v * 10 + t % 10; t /= 10; }`: Mirror the half to produce the full base-10 palindrome.
- `if (v < limit && pal(v, base)) total += v;`: Accumulate matches strictly below `limit`.
- `return total;`: Return the 64-bit sum.

## Test it out loud
- Test 1: `limit = 1, base = 2` $\to$ all generated $v \ge 1 \ge \text{limit} \to$ returns 0.
- Test 2: `limit = 10, base = 2` $\to$ generates $1, 3, 5, 7, 9 \to$ sum = 25.
- Test 3: `limit = 100, base = 2` $\to$ palindromes include $1, 3, 5, 7, 9, 33, 99 \to$ sum = 157.
- Test 4: `limit = 1000, base = 8` $\to$ returns 2155.

## Follow-ups
- Why do we generate base-10 palindromes instead of base-2 palindromes when `base = 2`?
  For $\text{limit} = 10^9$, base 10 has $\approx 2 \times 10^5$ palindromes, whereas base 2 has $\approx 2 \times 2^{15} \approx 6.5 \times 10^4$ palindromes. Generating either base is fast, but base 10 is shared across all test cases regardless of what `base` ($2 \le \text{base} \le 16$) is queried.
- What if `limit` exceeds $10^{18}$?
  Halves have up to 9 digits ($10^9$), requiring combinatorial search or meet-in-the-middle strategies.

## Common mistakes
- Testing every number up to $10^9$, which causes severe Time Limit Exceeded.
- Counting the limit value when $v == \text{limit}$ (the problem states strictly below limit).
- Overflowing 32-bit signed integers when summing palindromes up to $10^9$.
