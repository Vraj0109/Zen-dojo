---
id: c-atc-abc136-b
pattern: cses-atcoder
difficulty: easy
optimal: "O(1) time, O(1) space"
reviewed: false
---

## Clarify first

- What numbers are being counted? (All integers from 1 up to $n$ inclusive whose decimal representation contains an odd number of digits, without leading zeros).
- Which numbers have an odd number of digits? (1-digit numbers $1 \dots 9$, 3-digit numbers $100 \dots 999$, 5-digit numbers $10000 \dots 99999$, 7-digit numbers, and 9-digit numbers).
- What are the constraints on $n$? ($1 \le n \le 1,000,000,000$).
- Can this be solved without looping over every number from 1 to $n$? (Yes, since $n \le 10^9$, looping over all $10^9$ numbers would take seconds, whereas grouping by digit lengths takes $O(1)$ time).
- What should be returned? (An integer count of the qualifying numbers).

## Examples to say out loud

- Small limit: `n = 11`.
  - 1-digit numbers: 1 to 9 (9 numbers).
  - 2-digit numbers: 10 and 11 have 2 digits (even, not counted).
  - Total count: 9. Output is 9.
- Three-digit limit: `n = 136`.
  - 1-digit: 1 to 9 (9 numbers).
  - 2-digit: 10 to 99 (0 counted).
  - 3-digit: 100 to 136 ($136 - 100 + 1 = 37$ numbers).
  - Total count: $9 + 37 = 46$. Output is 46.
- Single digit boundary: `n = 1`. Only 1 has one digit. Output is 1.

## Brute force

A naive brute-force loop checks every integer $i$ from 1 to $n$. For each integer, it calculates the number of decimal digits (e.g. by converting to string or repeatedly dividing by 10) and checks if the digit count is odd. Because $n$ can be up to $10^9$, checking $10^9$ numbers takes several seconds and times out.

## The key observation

Numbers with a fixed number of digits $d$ form contiguous intervals in base 10:
- 1 digit: $[1, 9]$
- 2 digits: $[10, 99]$
- 3 digits: $[100, 999]$
- 4 digits: $[1000, 9999]$
- 5 digits: $[10000, 99999]$, and so forth.
For any odd digit count $d \in \{1, 3, 5, 7, 9\}$, the interval of $d$-digit numbers is $[\text{lo}, \text{hi}] = [10^{d-1}, 10^d - 1]$.
If $n \ge \text{lo}$, the number of integers in this interval that do not exceed $n$ is:
$$\text{count} = \min(n, \text{hi}) - \text{lo} + 1$$
We can simply sum the contributions of the odd digit lengths $d = 1, 3, 5, 7, 9$ in at most 9 iterations.

## Optimal approach

1. Initialize `lo = 1` and `total = 0`.
2. Loop through digit counts `d` from 1 to 9:
   a. Compute the upper bound for $d$ digits: `hi = lo * 10 - 1`.
   b. If $d$ is odd (`d % 2 == 1`) and $n \ge \text{lo}$:
      - Add $\min(n, \text{hi}) - \text{lo} + 1$ to `total`.
   c. Update `lo *= 10` for the next digit count.
3. Return `total`.

Complexity:
- Time: `O(1)` as the loop runs for at most 9 constant steps (corresponding to digits 1 through 9 for $n \le 10^9$).
- Space: `O(1)` auxiliary space as only a few scalar registers are used.

## Code walkthrough

In the reference implementation:
- `long long lo = 1;`: maintains the lower bound $10^{d-1}$ for each digit length.
- `long long hi = lo * 10 - 1;`: computes the upper bound $10^d - 1$.
- `if (d % 2 == 1 && n >= lo)`: filters for odd digit counts whose intervals overlap with $[1, n]$.
- `total += (int)(min<long long>(n, hi) - lo + 1);`: clips the interval count at $n$ and adds it to the running sum.
- `lo *= 10;`: advances to the next power of 10.
- `return total;`: returns the combined count.

## Test it out loud

- `n = 1`:
  - $d = 1$: $\min(1, 9) - 1 + 1 = 1$.
  - Total is 1. Returns 1.
- `n = 9`:
  - $d = 1$: $\min(9, 9) - 1 + 1 = 9$. Returns 9.
- `n = 10`:
  - $d = 1$: 9.
  - $d = 2$: even, skipped.
  - Total is 9. Returns 9.
- `n = 100`:
  - $d = 1$: 9.
  - $d = 3$: $\min(100, 999) - 100 + 1 = 1$.
  - Total: $9 + 1 = 10$. Returns 10.

## Follow-ups

- What if $n$ can be up to $10^{18}$?
  The exact same logic scales to 18 digits by looping $d$ from 1 to 18 using 64-bit integers (`long long`), running in 18 steps ($O(1)$).
- What if numbers are represented in base $B$ instead of base 10?
  Replace the multiplier 10 with base $B$: $\text{lo} = B^{d-1}, \text{hi} = B^d - 1$.

## Common mistakes

- Simulating with a loop from 1 to $n$: works for $n \le 10^5$, but times out for $n = 10^9$.
- 32-bit signed integer overflow when computing `lo * 10 - 1`: when $d = 9$, `lo = 1,000,000,000`, so `lo * 10` is $10^{10} > 2^{31} - 1$. Using `long long` for `lo` and `hi` prevents overflow.
- Off-by-one errors in interval lengths (forgetting the $+ 1$ in `hi - lo + 1`).

## Further reading

- Digits in positional numeral systems and interval decomposition.
- Prefix counting techniques in combinatorial mathematics.
