---
id: c-euler-8
pattern: cses-euler
difficulty: easy
optimal: "O(n * k) time, O(n * k) space"
brute: same
reviewed: false
---

## Clarify first

- What characters can the `digits` string contain? (Only decimal digit characters `'0'` through `'9'`).
- What are the constraints on string length and window size `k`? (`1 <= k <= digits.length <= 1000`, with `k <= 13`).
- Can the product exceed 32-bit signed integers? (Yes, the maximum possible product is $9^{13} \approx 2.54 \times 10^{12}$, which requires a 64-bit integer type like `long long` or `long`).
- How should blocks containing the digit `'0'` be handled? (Any block containing a `'0'` has a product of 0).
- What should be returned if all blocks contain `'0'`? (The maximum product is 0).

## Examples to say out loud

- Standard case: `digits = "123456789", k = 3`. The 3-digit blocks are "123" (product 6), "234" (24), "345" (60), "456" (120), "567" (210), "678" (336), and "789" (504). The maximum product is 504.
- Zeros present: `digits = "1000000", k = 2`. Every adjacent pair contains at least one zero ("10", "00"), so all products are 0. The output is 0.
- Single digit: `digits = "9", k = 1`. There is only one block "9", with product 9.

## Brute force

A naive brute-force method generates all $\binom{n}{k}$ subsequences, but the problem explicitly restricts choices to contiguous substrings of length $k$. There are exactly $n - k + 1$ contiguous substrings of length $k$. For each starting index $i$ from $0$ up to $n - k$, we can compute the product of the $k$ digits directly. Since $n \le 1000$ and $k \le 13$, this evaluates at most $1000 \times 13 = 13,000$ multiplications, which executes instantaneously in microseconds.

## The key observation

Because $k$ is bounded by 13 and the string length $n$ is at most 1000, calculating the product of each length-$k$ window from scratch requires at most 13,000 multiplications. While a sliding window with division is theoretically possible, dividing out old digits fails whenever a zero enters or leaves the window. Recomputing the product for each window avoids zero-division edge cases entirely while remaining well within constant time thresholds.

## Optimal approach

1. Track a 64-bit maximum product `best = 0`.
2. Iterate the start index `i` from 0 up to `digits.length - k`:
   a. Initialize a 64-bit accumulator `p = 1`.
   b. Loop `j` from `i` up to `i + k - 1`:
      - Multiply `p *= (digits[j] - '0')`.
   c. Update `best = max(best, p)`.
3. Return `best`.

Complexity:
- Time: `O(n * k)` where $n$ is the length of `digits` and $k \le 13$. There are $n - k + 1$ windows, each evaluated with $k$ multiplications (at most 13,000 operations total).
- Space: `O(1)` auxiliary space beyond storing the input string, since only scalar 64-bit registers are used.

## Code walkthrough

In the reference implementation:
- `long long best = 0;`: initializes the optimal answer tracker to zero.
- `for (int i = 0; i + k <= (int)digits.size(); i++)`: slides the starting index of the window across all valid boundaries.
- `long long p = 1;`: resets the window product for each candidate slice.
- `p *= digits[j] - '0';`: converts ASCII character codes into integer digits and accumulates the 64-bit product.
- `best = max(best, p);`: records the running maximum across all inspected windows.

## Test it out loud

- `digits = "0", k = 1`:
  - `i = 0`: single character `'0'`, `p = 0`. `best = max(0, 0) = 0`. Returns 0.
- `digits = "12345", k = 2`:
  - `i = 0 ("12")`: $1 \times 2 = 2$.
  - `i = 1 ("23")`: $2 \times 3 = 6$.
  - `i = 2 ("34")`: $3 \times 4 = 12$.
  - `i = 3 ("45")`: $4 \times 5 = 20$.
  - `best` updates to 20. Returns 20.
- `digits = "9090909090909", k = 2`:
  - Every pair of adjacent characters is either "90" or "09", each containing zero. Product is always 0. Returns 0.

## Follow-ups

- What if $k$ were much larger (e.g., $k = 100,000$ and $n = 1,000,000$)?
  We would maintain a sliding product across non-zero segments: track the count of zeros in the current window and multiply/divide non-zero digits, resetting the window whenever a zero is encountered.
- What if the digits string contains non-numeric characters?
  Sanitize the input first by filtering out non-digit characters or treating invalid characters as window delimiters.

## Common mistakes

- Using 32-bit signed integers for `p`: with $k = 13$, thirteen consecutive 9s yield $9^{13} = 2,541,865,828,329$, which overflows standard 32-bit signed integers ($2.14 \times 10^9$) and produces incorrect negative products.
- Off-by-one errors in window limits: looping `i < digits.size() - k` skips the last window; the correct condition is `i + k <= digits.size()`.
- Trying to implement a sliding window division without handling zero, resulting in division by zero runtime exceptions.

## Further reading

- Sliding window technique and amortized analysis.
- Multi-precision arithmetic and arbitrary-precision integer representations.
