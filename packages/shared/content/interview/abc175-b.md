---
id: abc175-b
pattern: cses-atcoder
difficulty: medium
optimal: "O(n^3) time, O(1) space"
reviewed: false
---

## Clarify first
- What are the inputs? An array $l$ containing the lengths of $n$ sticks.
- What constitutes a valid selection? A choice of three sticks at distinct index positions $i < j < k$ such that:
  1. All three lengths are pairwise distinct: $l[i] \ne l[j]$, $l[j] \ne l[k]$, and $l[i] \ne l[k]$.
  2. The three sticks can form a non-degenerate triangle with positive area (the triangle inequality holds: the sum of the lengths of any two sides must be strictly greater than the third).
- What are the constraints? $3 \le n \le 100$, and lengths $1 \le l[i] \le 10^9$.
- Can stick lengths overflow 32-bit signed integers? Yes, since $l[i]$ can reach $10^9$, summing two lengths can exceed $2 \times 10^9$, requiring 64-bit integer types (`long long`) to evaluate the triangle inequality safely.

## Examples to say out loud
- Consider $l = [4, 4, 9, 7, 5]$.
  There are two sticks of length 4, but any triangle requires pairwise distinct lengths.
  Possible distinct length triples:
  - $(4, 9, 7)$: $4 + 7 = 11 > 9$ (valid). Since there are two sticks of length 4, this forms 2 ways.
  - $(4, 7, 5)$: $4 + 5 = 9 > 7$ (valid). Two sticks of length 4 give 2 ways.
  - $(9, 7, 5)$: $7 + 5 = 12 > 9$ (valid). 1 way.
  Total valid triples: $2 + 2 + 1 = 5$.
- Consider $l = [1, 2, 3]$.
  Lengths are distinct, but $1 + 2 = 3$ (degenerate, zero area). Not a valid triangle $\to$ returns 0.
- Consider $l = [1, 1, 1]$.
  Lengths are not pairwise distinct $\to$ returns 0.

## Brute force
With $n \le 100$, the total number of index triples $i < j < k$ is $\binom{100}{3} = \frac{100 \times 99 \times 98}{6} = 161,700$. Checking the distinctness condition and the triangle inequality for 161,700 triples takes fewer than $10^6$ operations, executing in ~5 milliseconds. Thus, a triple nested loop is both simple and fully optimal.

## The key observation
For any three lengths $a, b, c$:
1. Distinctness: $a \ne b \land b \ne c \land a \ne c$.
2. Triangle inequality: The longest side $M = \max(a, b, c)$ must be strictly less than the sum of the other two sides:
   $M < (a + b + c) - M \iff 2M < a + b + c$.
Using 64-bit integers for the sum prevents integer overflow.

## Optimal approach
1. Initialize a counter `count = 0`.
2. Loop index $i$ from 0 to $n - 1$:
   - Loop index $j$ from $i + 1$ to $n - 1$:
     - Loop index $k$ from $j + 1$ to $n - 1$:
       - Let $a = l[i], b = l[j], c = l[k]$ as 64-bit integers.
       - If $a == b$ or $b == c$ or $a == c$, continue.
       - Let $M = \max(a, \max(b, c))$.
       - If $M < a + b + c - M$, increment `count++`.
3. Return `count`.
4. Complexity:
   - Time Complexity: $O(n^3)$, performing $\approx \frac{n^3}{6} \le 161,700$ iterations.
   - Space Complexity: $O(1)$, using only scalar variables.

## Code walkthrough
- `int n = l.size(), count = 0;`: Initialize size and counter.
- `for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++) for (int k = j + 1; k < n; k++)`: Enumerate all unique combinations of 3 positions.
- `if (a == b || b == c || a == c) continue;`: Enforce pairwise distinct length requirement.
- `long long mx = max(a, max(b, c));`: Find the longest stick among the three.
- `if (mx < a + b + c - mx) count++;`: Verify that the sum of the two shorter sides strictly exceeds the longest.

## Test it out loud
- Test 1: $l = [3, 4, 5] \to \max=5 < 3 + 4 = 7 \to$ returns 1.
- Test 2: $l = [1, 1, 1] \to$ lengths match $\to$ returns 0.
- Test 3: $l = [2, 3, 4, 5] \to$ valid triples: $(2, 3, 4), (2, 4, 5), (3, 4, 5) \to$ returns 3.
- Test 4: $l = [1, 2, 4, 8] \to$ no triple satisfies triangle inequality $\to$ returns 0.

## Follow-ups
- Can this be solved in $O(n^2)$ time?
  Yes, by sorting the unique lengths and using two pointers / binary search to count valid third sides, similar to LeetCode 611 (Valid Triangle Number), though for $n \le 100$ the $O(n^3)$ approach is more than fast enough.
- What if equilateral or isosceles triangles were permitted?
  Remove the distinctness check $a \ne b \land b \ne c \land a \ne c$.

## Common mistakes
- 32-bit signed integer overflow when computing $a + b$ or $a + b + c$ with stick lengths up to $10^9$.
- Allowing degenerate triangles with zero area where $a + b = c$ (the triangle inequality requires strictly greater $>$).
- Double counting combinations if looping indices from 0 instead of maintaining $i < j < k$.
