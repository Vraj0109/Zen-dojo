---
id: c-euler-17
pattern: cses-euler
difficulty: medium
optimal: "O(n) time, O(1) space"
reviewed: false
---

## Clarify first

- What numbers are counted? (All integers from 1 up to $n$ inclusive written out in British English words).
- What characters are counted? (Count only alphabet letters; spaces, hyphens, and punctuation are completely ignored).
- What specific rules govern the British English wording?
  - Numbers below 20: `"one"`, `"two"`, ..., `"nineteen"`.
  - Multiples of ten: `"twenty"`, `"thirty"`, ..., `"ninety"`.
  - The word `"hundred"` has 7 letters; `"thousand"` has 8 letters.
  - The word `"and"` (3 letters) is included when a number above 100 has a non-zero tens or units part (e.g. `"one hundred and one"` or `"one thousand and five"`), but is omitted if the last two digits are `"00"` (e.g. `"five hundred"`).
- What are the constraints on $n$? ($1 \le n \le 99,999$).
- What should be returned? (The total count of letters used across all numbers from 1 to $n$).

## Examples to say out loud

- First 5 numbers: `n = 5`.
  - 1: `"one"` (3)
  - 2: `"two"` (3)
  - 3: `"three"` (5)
  - 4: `"four"` (4)
  - 5: `"five"` (4)
  - Total: $3 + 3 + 5 + 4 + 4 = 19$. Output is 19.
- Numbers up to 15: `n = 15`. Output is 74.
- Exact hundred: `n = 100`. Total letters from 1 to 100 is 864.
- Use of "and": 101 is `"one hundred and one"` ($3 + 7 + 3 + 3 = 16$ letters).

## Brute force

A brute-force strategy formats every number from 1 to $n$ into a complete text string using string concatenation, strips spaces and hyphens, and takes the string length. Because $n \le 99,999$, creating 100,000 strings and doing string allocations is unnecessarily memory-intensive and slow, though still $O(n)$ in concept. Computing the letter counts numerically without allocating strings is much cleaner and faster.

## The key observation

The English representation of any integer $x \le 99,999$ decomposes hierarchically into modular components:
1. Below 100: numbers $< 20$ have fixed lookup lengths; numbers $20 \dots 99$ decompose into tens length plus units length.
2. Below 1,000: if hundreds digit $h > 0$, add length of $h$ plus 7 (for `"hundred"`). If both $h > 0$ and remainder $r > 0$, add 3 (for `"and"`). Then add letter count of remainder $r < 100$.
3. Up to 99,999: let thousands $t = x / 1000$ and remainder $r = x \bmod 1000$. If $t > 0$, add count of $t$ (which is $< 100$) plus 8 (for `"thousand"`). If $t > 0$ and remainder $r$ has no hundreds digit ($0 < r < 100$), add 3 for `"and"` (e.g., `"one thousand and five"`). Then add letter count for $r$.
Adding the counts iteratively across $i = 1 \dots n$ evaluates the total in $O(n)$ time.

## Optimal approach

1. Precompute static length tables for numbers $0 \dots 19$ and multiples of 10 (`"twenty"`, `"thirty"`, etc.).
2. Write modular helpers:
   - `below100(x)`: returns letter count for $x < 100$.
   - `below1000(x)`: returns letter count for $x < 1000$, adding 7 for `"hundred"` and 3 for `"and"` when $h > 0$ and $r > 0$.
   - `one(x)`: splits $x$ into thousands and remainder, adding 8 for `"thousand"` and 3 for `"and"` where appropriate.
3. Iterate $i$ from 1 to $n$, accumulating `one(i)` into `total`.
4. Return `total`.

Complexity:
- Time: `O(n)` time to process $n$ numbers, where each number takes $O(1)$ arithmetic operations. For $n = 99,999$, this finishes in under 10 ms.
- Space: `O(1)` auxiliary space as only small static lookup arrays are used.

## Code walkthrough

In the reference implementation:
- `const char* ones[20]`: holds word strings for numbers 0 through 19.
- `const char* tens[10]`: holds word strings for 20, 30, ..., 90.
- `below100(x)`: handles two-digit numbers, distinguishing teens from tens plus ones.
- `below1000(x)`: formats 3-digit numbers, checking whether `"and"` is needed between hundreds and trailing digits.
- `one(x)`: handles thousands up to 99,000, enforcing British grammar rules for `"and"`.
- `for (int i = 1; i <= n; i++) total += one(i);`: sums the letter counts for all integers from 1 to $n$.

## Test it out loud

- `n = 1`: `"one"` has 3 letters. Returns 3.
- `n = 5`: sums to 19. Returns 19.
- `n = 20`: adds 19 (for 1..5) through 20. Returns 112.
- `100`: `"one hundred"` ($3 + 7 = 10$). Total for 1..100 is 864.
- `101`: `"one hundred and one"` ($3 + 7 + 3 + 3 = 16$). Total is $864 + 16 = 880$.

## Follow-ups

- What if $n$ is up to $10^{18}$?
  We would use Combinatorial Counting / Digit DP: count how many times each word (e.g. `"hundred"`, `"thousand"`, `"one"`, `"and"`) appears across all valid numbers by computing digit combinations in positional bases.
- What if American English rules apply instead of British English?
  In American English, the word `"and"` is omitted entirely from numbers (e.g. `"one hundred one"` instead of `"one hundred and one"`).

## Common mistakes

- Spelling `"forty"` as `"fourty"` (which has 6 letters instead of 5).
- Including `"and"` when the last two digits are zero (e.g., `"three hundred and"` for 300, which is incorrect).
- Forgetting `"and"` when thousands are followed directly by numbers less than 100 (e.g., `"one thousand and five"`).
- Counting spaces or hyphens.

## Further reading

- Project Euler Problem 17 formal specifications and British English conventions.
- Positional number systems and digit dynamic programming.
