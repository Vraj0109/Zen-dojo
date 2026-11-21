---
id: abc155-a
pattern: cses-atcoder
difficulty: medium
optimal: "O(1) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What are the inputs? Three integers $a, b,$ and $c$.
- What condition makes the triplet "poor"? A triplet is called poor if exactly two of the three integers are equal to each other, and the third integer is distinct.
- What if all three numbers are equal ($a = b = c$)? All three being equal does NOT qualify; the answer must be `"No"`.
- What if all three numbers are mutually distinct ($a \ne b, b \ne c, a \ne c$)? None are equal, so it does NOT qualify; the answer must be `"No"`.
- What should be returned? The string `"Yes"` if exactly two numbers are equal, and `"No"` otherwise.
- What are the constraints? $1 \le a, b, c \le 100$.

## Examples to say out loud
- Consider $a = 5, b = 7, c = 5$.
  $a == c = 5$, while $b = 7$ is different.
  Exactly two numbers are equal $\to$ return `"Yes"`.
- Consider $a = 4, b = 4, c = 4$.
  All three numbers are equal $\to$ return `"No"`.
- Consider $a = 1, b = 2, c = 3$.
  All three numbers are different $\to$ return `"No"`.

## Brute force
A naive approach would check nested conditions:
`(a == b && a != c) || (a == c && a != b) || (b == c && b != a)`.
While this works and runs in $O(1)$ time, counting equal pairs provides a more concise and elegant mathematical check.

## The key observation
Consider the three possible equality comparisons between pairs of numbers:
- $e_1 = (a == b)$
- $e_2 = (b == c)$
- $e_3 = (a == c)$
Let $E = e_1 + e_2 + e_3$ (treating true as 1 and false as 0).
- If all three numbers are distinct: $E = 0$.
- If exactly two numbers are equal: exactly one pair matches, so $E = 1$.
- If all three numbers are equal: all three pairs match, so $E = 3$ (it is mathematically impossible for $E = 2$).
Therefore, the condition "exactly two numbers are equal" is completely equivalent to:
$(a == b) + (b == c) + (a == c) == 1$.

## Optimal approach
1. Compute the count of matching pairs:
   `eq = (a == b ? 1 : 0) + (b == c ? 1 : 0) + (a == c ? 1 : 0)`.
2. If `eq == 1`, return `"Yes"`.
3. Otherwise, return `"No"`.
4. Complexity:
   - Time Complexity: $O(1)$, exactly three integer comparisons and additions.
   - Space Complexity: $O(1)$, requiring only one scalar integer.

## Code walkthrough
- `int eq = (a == b) + (b == c) + (a == c);`: Sum the truth values of the three pairwise equality checks.
- `return eq == 1 ? "Yes" : "No";`: Return `"Yes"` if exactly one pair is equal, otherwise `"No"`.

## Test it out loud
- Test 1: $a = 1, b = 1, c = 2 \to (1) + (0) + (0) = 1 \to$ `"Yes"`.
- Test 2: $a = 1, b = 2, c = 1 \to (0) + (0) + (1) = 1 \to$ `"Yes"`.
- Test 3: $a = 2, b = 1, c = 1 \to (0) + (1) + (0) = 1 \to$ `"Yes"`.
- Test 4: $a = 1, b = 2, c = 3 \to (0) + (0) + (0) = 0 \to$ `"No"`.
- Test 5: $a = 100, b = 100, c = 100 \to (1) + (1) + (1) = 3 \to$ `"No"`.

## Follow-ups
- How to express this using sets?
  Insert $a, b, c$ into a set (or hash set). Exactly two numbers are equal if and only if the set size is exactly 2: `set<int>{a, b, c}.size() == 2`.
- How would you generalize this to $n$ numbers where exactly $k$ numbers are equal?
  Count frequencies of all numbers in a frequency map or array, and check if the multiset of frequencies matches the requirement.

## Common mistakes
- Checking `(a == b || b == c || a == c)` without checking that not all three are equal, which incorrectly returns `"Yes"` when $a = b = c$.
- Returning boolean `true`/`false` instead of the required strings `"Yes"`/`"No"`.
