---
id: c-euler-55
pattern: cses-euler
difficulty: hard
optimal: "O(limit * iterations * digits) time, O(digits) space"
reviewed: false
---

## Clarify first
- What is the reverse-and-add process? Given a number, add it to the number formed by reversing its decimal digits to obtain a new sum. Repeat this process with the new sum.
- What is a Lychrel number in this context? A starting integer $n$ ($1 \le n < \text{limit}$) that does NOT produce a palindromic sum within `iterations` steps.
- Are we checking if the starting number itself is a palindrome? No, only the sums produced *after* at least one reverse-and-add step are checked for palindromicity. If a starting number is already a palindrome (e.g. 44), it must still be added to its reverse ($44 + 44 = 88$, which is a palindrome on step 1) to be eliminated.
- What are the parameter bounds? $1 \le \text{limit} \le 100,000$ and $1 \le \text{iterations} \le 60$.
- Why can't we use 64-bit integer addition? Within 60 iterations of reverse-and-add, numbers can grow beyond $2^{64}$ (reaching dozens of digits). Therefore, addition must be done on arbitrary-precision digit strings.

## Examples to say out loud
- Consider $n = 47$ with `iterations = 1`.
  - Step 1: $47 + 74 = 121$.
  - 121 is a palindrome. It took 1 step $\to$ not a Lychrel number.
- Consider $n = 349$ with `iterations = 3`.
  - Step 1: $349 + 943 = 1292$ (not palindrome).
  - Step 2: $1292 + 2921 = 4213$ (not palindrome).
  - Step 3: $4213 + 3124 = 7337$ (palindrome).
  Produces a palindrome within 3 steps $\to$ not counted.
- Consider `limit = 100, iterations = 10`.
  Only 89 and 98 require more than 10 iterations to become palindromes $\to$ count is 2.

## Brute force
Testing every number $n \in [1, \text{limit} - 1]$ through up to `iterations` steps of string arithmetic is the standard approach. Because `limit` $\le 100,000$ and `iterations` $\le 60$, with numbers having at most 40-50 digits, the total operations remain well within the execution time budget.

## The key observation
1. Standard 64-bit integers overflow after $\sim 20$ iterations, so numbers must be maintained as ASCII decimal digit strings or vectors of digits.
2. The reverse-and-add step on a digit string $s$:
   Add $s[i]$ to $s[|s| - 1 - i]$ plus carry, from right to left, and build the new sum string.
3. Palindrome testing on a string $s$:
   Two-pointer equality check comparing $s[i]$ with $s[|s| - 1 - i]$.
4. For each $n < \text{limit}$, simulate up to `iterations` steps:
   If `pal(s)` ever becomes true after a step, stop early. If the loop completes all `iterations` without finding any palindrome, increment the Lychrel counter.

## Optimal approach
1. Implement helper `addRev(s)`:
   - Loop index $i$ from $|s| - 1$ down to 0:
     - `v = (s[i] - '0') + (s[|s| - 1 - i] - '0') + carry`
     - Append `v % 10` to output buffer
     - Update `carry = v / 10`
   - If `carry > 0`, append `carry`.
   - Reverse output buffer and return.
2. Implement helper `pal(s)`:
   - Two-pointer check: if $s[i] \ne s[|s| - 1 - i]$ for any $i$, return `false`; else `true`.
3. Initialize `lychrel_count = 0`.
4. Loop $n$ from 1 to $\text{limit} - 1$:
   - Convert $n$ to string $s$.
   - Flag `found = false`.
   - Loop `step` from 0 to `iterations - 1`:
     - $s \leftarrow \text{addRev}(s)$.
     - If $\text{pal}(s)$: set `found = true` and break.
   - If `!found`, increment `lychrel_count++`.
5. Return `lychrel_count`.
6. Complexity:
   - Time Complexity: $O(\text{limit} \cdot \text{iterations} \cdot \text{digits})$, where $\text{digits} \le 50$. For $\text{limit} = 10^5$, total basic character operations $\approx 5 \times 10^7$, completing in ~200 milliseconds.
   - Space Complexity: $O(\text{digits})$ space to store the string buffer.

## Code walkthrough
- `static string addRev(const string& s)`: Adds string $s$ to its reverse digit by digit with carry.
- `static bool pal(const string& s)`: Symmetric character verification.
- `for (int n = 1; n < limit; n++)`: Iterate through candidate starting numbers strictly below `limit`.
- `for (int it = 0; it < iterations && !found; it++)`: Perform up to `iterations` reverse-and-add operations.
- `if (!found) count++;`: Tally numbers that failed to produce any palindrome within the allowed step budget.

## Test it out loud
- Test 1: `limit = 1, iterations = 1` $\to$ empty range $[1, 0] \to$ returns 0.
- Test 2: `limit = 100, iterations = 1` $\to$ returns 42.
- Test 3: `limit = 200, iterations = 2` $\to$ returns 48.
- Test 4: `limit = 100, iterations = 10` $\to$ only 89 and 98 do not form a palindrome in 10 steps $\to$ returns 2.

## Follow-ups
- What is the most famous suspected Lychrel number in base 10?
  The number 196: it has been iterated over a billion steps without ever producing a palindrome, though an unreachability proof remains an open mathematical problem.
- Could memoization be applied across starting numbers?
  Yes, if an intermediate sum is known to lead to a palindrome within remaining steps, we could terminate earlier; however, map lookup overhead often outweighs raw string addition for small iteration limits.

## Common mistakes
- Checking if the starting number $n$ itself is a palindrome before any addition; the problem requires testing *sums* produced after at least one addition.
- Using 64-bit primitive types (`long long`) instead of arbitrary-precision string arithmetic, leading to silent numeric overflow.
- Testing up to $\le \text{limit}$ instead of $< \text{limit}$.
