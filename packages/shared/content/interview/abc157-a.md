---
id: abc157-a
pattern: cses-atcoder
difficulty: medium
optimal: "O(1) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What does the printer do? The printer prints two pages per sheet of paper (one page on the front, one page on the back).
- What is the input? An integer $n$ representing the total number of pages in the document.
- What if $n$ is odd? The last sheet will contain only one printed page, but it still requires a full physical sheet of paper.
- What is the constraint on $n$? $1 \le n \le 100$.
- What should be returned? The minimum number of sheets of paper required to print all $n$ pages.

## Examples to say out loud
- Consider $n = 5$.
  - Sheet 1 holds pages 1 and 2.
  - Sheet 2 holds pages 3 and 4.
  - Sheet 3 holds page 5.
  Total sheets needed: 3.
  Notice $\lceil 5 / 2 \rceil = 3$.
- Consider $n = 2$.
  Sheet 1 holds pages 1 and 2.
  Total sheets: 1.
- Consider $n = 1$.
  Sheet 1 holds page 1.
  Total sheets: 1.

## Brute force
A naive approach might simulate printing page by page: while pages remain, subtract up to 2 pages and increment a sheet counter. Since $n \le 100$, this takes at most 50 loop steps. However, division directly produces the answer in a single constant-time mathematical expression.

## The key observation
Each physical sheet holds up to 2 pages. The number of sheets required is the mathematical ceiling of $n / 2$:
$\text{sheets} = \lceil \frac{n}{2} \rceil$.
In integer arithmetic with standard truncation towards zero, the ceiling of $n / 2$ for positive integers is computed as:
$\lfloor \frac{n + 1}{2} \rfloor$.
When $n$ is even ($n = 2k$), $(2k + 1) / 2 = k$.
When $n$ is odd ($n = 2k + 1$), $(2k + 2) / 2 = k + 1$.
This provides the exact ceiling in a single arithmetic operation without branching or floating-point arithmetic.

## Optimal approach
1. Compute the required sheet count using integer ceiling division: `(n + 1) / 2`.
2. Return the result.
3. Complexity:
   - Time Complexity: $O(1)$, exactly one addition and one integer division.
   - Space Complexity: $O(1)$, requiring no extra storage.

## Code walkthrough
- `int sheetsNeeded(int n)`: Function accepting total document pages $n$.
- `return (n + 1) / 2;`: Exact ceiling of $n / 2$ using integer arithmetic.

## Test it out loud
- Test 1: $n = 1 \to (1 + 1) / 2 = 1$.
- Test 2: $n = 3 \to (3 + 1) / 2 = 2$.
- Test 3: $n = 4 \to (4 + 1) / 2 = 2$.
- Test 4: $n = 99 \to (99 + 1) / 2 = 50$.
- Test 5: $n = 100 \to (100 + 1) / 2 = 50$.

## Follow-ups
- What if the printer prints $k$ pages per sheet instead of 2 (e.g. 4 pages per sheet in booklet mode)?
  The formula generalizes to `(n + k - 1) / k`.
- What if $n = 0$?
  If empty documents are allowed, $n = 0$ would yield $(0 + 1) / 2 = 0$ in integer division, which correctly returns 0 sheets.

## Common mistakes
- Using standard integer division `n / 2` without rounding up, which erroneously answers 2 sheets instead of 3 for $n = 5$.
- Using `ceil((double)n / 2.0)` with floating-point types, which introduces unnecessary overhead and potential precision pitfalls for very large integers.
