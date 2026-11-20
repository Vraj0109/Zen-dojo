---
id: c-euler-24
pattern: cses-euler
difficulty: medium
optimal: "O(n^2) time, O(n) space"
reviewed: false
---

## Clarify first

- Which digits are used to construct permutations? (The first `n` digits: $0, 1, \dots, n - 1$).
- Is the target permutation 1-indexed or 0-indexed? ($k$ is 1-indexed, ranging from 1 to $n!$).
- What is the range of $n$? ($1 \le n \le 10$).
- What should be returned? (A string of length $n$ containing the $k$-th permutation in lexicographical order).
- Can $k$ exceed $n!$? (Problem constraints specify $1 \le k \le n!$, so $k$ is always a valid permutation index).

## Examples to say out loud

- Base case: `n = 1, k = 1`. The only digit is `'0'`. Returns `"0"`.
- Small case: `n = 2, k = 2`. The permutations of `0, 1` in order are `"01"` and `"10"`. For $k = 2$, the answer is `"10"`.
- Stated example: `n = 3, k = 4`. The 6 permutations are `"012"`, `"021"`, `"102"`, `"120"`, `"201"`, `"210"`. For $k = 4$, the answer is `"120"`.

## Brute force

A brute-force strategy starts with the initial permutation `"012...` and repeatedly calls `std::next_permutation` (or a recursive backtracking generator) $k - 1$ times to step through to the $k$-th permutation. For $n = 10$, $n! = 3,628,800$. Stepping through millions of permutations requires millions of array swaps and comparisons, which is inefficient when the answer can be determined directly digit by digit.

## The key observation

The permutations are organized hierarchically by their leading digit. For $n$ digits, each choice of the first digit is followed by exactly $(n - 1)!$ permutations of the remaining $n - 1$ digits. By converting $k$ to a 0-based index $k' = k - 1$, the index of the first digit among the currently available sorted digits is $\lfloor k' / (n - 1)! \rfloor$. Once that digit is chosen and removed from the list of available digits, the remaining rank becomes $k' \bmod (n - 1)!$. We repeat this factoradic decomposition for all positions.

## Optimal approach

1. Precompute an array of factorials `fact` where `fact[i] = i!` for $0 \le i \le n$.
2. Create a list or string of available digits in sorted order: `"0", "1", ..., "n-1"`.
3. Decrement $k$ by 1 to make it 0-indexed: `k--`.
4. Initialize an empty output string `out`.
5. For position `i` from 0 to $n - 1$:
   a. Compute the block size of the remaining choices: `f = fact[n - 1 - i]`.
   b. Determine the index of the digit to pick: `idx = k / f`.
   c. Append `digits[idx]` to `out`.
   d. Remove `digits[idx]` from the list of available digits.
   e. Update `k = k % f`.
6. Return `out`.

Complexity:
- Time: `O(n^2)` because there are $n$ positions to determine, and removing an element from a list or string of size $n$ takes $O(n)$ time. For $n = 10$, $n^2 = 100$ operations, executing virtually instantaneously.
- Space: `O(n)` auxiliary space to store the factorial table, digits list, and output string.

## Code walkthrough

In the reference implementation:
- `vector<int> fact(n + 1, 1); for (int i = 1; i <= n; i++) fact[i] = fact[i - 1] * i;`: precomputes factorial block sizes.
- `string digits; for (int i = 0; i < n; i++) digits += char('0' + i);`: creates the initial pool of available symbols.
- `k--;`: shifts from 1-based to 0-based indexing for modular arithmetic.
- `int f = fact[n - 1 - i]; int idx = k / f;`: finds the exact element index in the sorted list of remaining digits.
- `out += digits[idx]; digits.erase(digits.begin() + idx);`: appends the selected digit and removes it from future consideration.
- `k %= f;`: reduces $k$ to the relative index within the chosen block.

## Test it out loud

- `n = 3, k = 4`:
  - `k` becomes 3 (0-based). `digits = "012"`.
  - Position $i = 0$: $f = 2! = 2$. $idx = 3 / 2 = 1$. Digit is `digits[1] = '1'`. `out = "1"`. Remove '1' $\to$ `digits = "02"`. $k = 3 \bmod 2 = 1$.
  - Position $i = 1$: $f = 1! = 1$. $idx = 1 / 1 = 1$. Digit is `digits[1] = '2'`. `out = "12"`. Remove '2' $\to$ `digits = "0"`. $k = 1 \bmod 1 = 0$.
  - Position $i = 2$: $f = 0! = 1$. $idx = 0 / 1 = 0$. Digit is `digits[0] = '0'`. `out = "120"`. Remove '0'.
  - Returns `"120"`.
- `n = 1, k = 1`:
  - `k = 0`. $f = 0! = 1$. $idx = 0$. Appends `'0'`. Returns `"0"`.

## Follow-ups

- What if $n$ were larger (e.g., $n = 100,000$)?
  For large $n$, $n!$ exceeds standard numeric limits and requires arbitrary precision or bit operations. The removal from `digits` can be optimized from $O(n)$ to $O(\log n)$ using a Fenwick tree (Binary Indexed Tree) or Order Statistic Tree.
- What if the digits contain duplicates?
  We would divide $k$ by the count of distinct permutations formed by the remaining multiset: $\frac{(n-1)!}{\prod c_i!}$, iterating through unique symbols.

## Common mistakes

- Forgetting to convert $k$ to 0-based index (`k--`), which shifts all block calculations by 1 and produces the wrong permutation.
- Reusing an already chosen digit instead of erasing it from the candidate set.
- Miscalculating the remaining factorial: using $fact[n - i]$ instead of $fact[n - 1 - i]$, which groups elements by the wrong stride.

## Further reading

- Factorial number system (factoradics) and Lehmer codes.
- Order statistic trees for $O(n \log n)$ ranking and unranking.
