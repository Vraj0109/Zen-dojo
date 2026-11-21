---
id: c-cf-271a
pattern: cses-codeforces
difficulty: easy
optimal: "O(1) iterations on average, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What defines a "beautiful year"? A year is beautiful if all of its decimal digits are pairwise distinct (no two digits are identical).
- What should be returned? The smallest integer year strictly greater than $y$ ($y' > y$) whose digits are all distinct.
- What are the constraints on $y$? $1000 \le y \le 9000$.
- How far could the next beautiful year be from $y$? At most a few dozen years (for example, after 1987, the next beautiful year is 2013, which is 26 years later). The search space is extremely small.

## Examples to say out loud
- Consider $y = 1987$.
  - 1988: '8' repeated.
  - 1989: '9' repeated.
  - 1990 to 1999: '9' or '1' repeated.
  - 2000 to 2012: '0' or '2' or '1' repeated.
  - 2013: digits are 2, 0, 1, 3 (all four distinct).
  Result: 2013.
- Consider $y = 2013$.
  $2014$ has digits 2, 0, 1, 4 (all distinct) $\to$ return 2014.
- Consider $y = 1000 \to 1023$.

## Brute force
A brute force approach tests years sequentially starting from $y + 1$. For each candidate year, decompose it into its 4 digits and check whether all pairs are distinct. Because beautiful years are dense across the 4-digit number line, the while loop executes at most a few dozen times, taking less than 1 millisecond.

## The key observation
For a 4-digit number $y$:
- Thousands digit: $a = y / 1000$
- Hundreds digit: $b = (y / 100) \pmod{10}$
- Tens digit: $c = (y / 10) \pmod{10}$
- Units digit: $d = y \pmod{10}$
The digits are pairwise distinct if and only if all $\binom{4}{2} = 6$ pairs differ:
$a \ne b \land a \ne c \land a \ne d \land b \ne c \land b \ne d \land c \ne d$.
Incrementing $y$ by 1 in a loop and testing these 6 comparisons terminates on the first valid year.

## Optimal approach
1. Loop infinitely:
   - Increment $y \leftarrow y + 1$.
   - Extract the four digits:
     - $a = y / 1000$
     - $b = (y / 100) \% 10$
     - $c = (y / 10) \% 10$
     - $d = y \% 10$
   - If $a \ne b \land a \ne c \land a \ne d \land b \ne c \land b \ne d \land c \ne d$:
     - Return $y$.
2. Complexity:
   - Time Complexity: $O(1)$ iterations on average. The loop checks at most a small constant number of years (rarely more than 30 iterations) with constant-time digit extraction.
   - Space Complexity: $O(1)$ auxiliary space.

## Code walkthrough
- `while (true) { y++; ... }`: Search forward sequentially starting strictly after the input year.
- `int a = y / 1000; int b = (y / 100) % 10; int c = (y / 10) % 10; int d = y % 10;`: Extract each of the 4 positional base-10 digits.
- `if (a != b && a != c && a != d && b != c && b != d && c != d) return y;`: Ensure all six pairwise inequality conditions are satisfied.

## Test it out loud
- Test 1: $y = 1000 \to$ scans up to 1023 $\to$ returns 1023.
- Test 2: $y = 1987 \to$ scans to 2013 $\to$ returns 2013.
- Test 3: $y = 2013 \to$ checks 2014, all distinct $\to$ returns 2014.
- Test 4: $y = 9000 \to$ returns 9012.
- Test 5: $y = 1234 \to$ checks 1235, all distinct $\to$ returns 1235.

## Follow-ups
- How to write the distinctness check using a hash set or bitmask?
  Insert characters into a set: `set(str(y)).size() == 4`, or check bitmask: `(1<<a) | (1<<b) | (1<<c) | (1<<d)` has popcount 4. Direct integer comparison is faster and allocates no heap memory.
- What if $y$ can have up to 18 digits?
  For arbitrary digit counts, greedy construction / digit DP from left to right constructs the next lexicographically smallest number with distinct digits in $O(\text{digits})$ time.

## Common mistakes
- Starting the check at $y$ instead of $y + 1$; if the input year $y$ already has distinct digits (e.g. 2013), the problem requires the strictly *next* year (2014).
- Missing one of the 6 pairwise comparisons (e.g. forgetting to check $b \ne d$).
