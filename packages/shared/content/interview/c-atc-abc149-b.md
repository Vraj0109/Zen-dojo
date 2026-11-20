---
id: c-atc-abc149-b
pattern: cses-atcoder
difficulty: easy
optimal: "O(1) time, O(1) space"
reviewed: false
---

## Clarify first
- What are Takahashi's priority rules for eating cookies?
  If Takahashi has at least one cookie, he eats one of his own. If he has none, but Aoki has at least one, he eats one of Aoki's. If both have zero, he does nothing.
- How many actions are performed? Exactly $k$ sequential actions.
- What are the ranges of $a$, $b$, and $k$? They can be up to $10^{12}$, which requires 64-bit integer types.
- Can $k$ exceed the total number of cookies $a + b$? Yes, in which case both end up with 0 cookies.

## Examples to say out loud
- Consider $a = 2$, $b = 3$, $k = 3$.
  - First action: Takahashi eats 1 of his own $\to a = 1, b = 3$.
  - Second action: Takahashi eats another of his own $\to a = 0, b = 3$.
  - Third action: Takahashi has none, so he eats 1 of Aoki's $\to a = 0, b = 2$.
  Result: `[0, 2]`.
- Edge case: $a = 500000000000$, $b = 500000000000$, $k = 1000000000000$.
  $k$ is large enough to exhaust both piles completely $\to$ `[0, 0]`.

## Brute force
A naive simulation decrements $a$ or $b$ one step at a time in a loop running $k$ iterations. Because $k \le 10^{12}$, an $O(k)$ simulation will time out immediately (taking thousands of seconds). We must determine the final cookie counts in $O(1)$ arithmetic operations.

## The key observation
Takahashi always exhausts his own cookies first before touching Aoki's.
Thus, Takahashi eats $\min(a, k)$ cookies from his own pile.
The number of actions remaining for Aoki's pile is $k' = k - \min(a, k)$.
From Aoki's pile, Takahashi eats $\min(b, k')$ cookies.
Subtracting these quantities directly from $a$ and $b$ gives the final counts in constant time.

## Optimal approach
1. Determine how many cookies Takahashi eats from his own pile: `eat_a = min(a, k)`.
2. Update $a \leftarrow a - \text{eat\_a}$ and $k \leftarrow k - \text{eat\_a}$.
3. Determine how many cookies he eats from Aoki's pile: `eat_b = min(b, k)`.
4. Update $b \leftarrow b - \text{eat\_b}$.
5. Return the pair `[a, b]`.
6. Complexity:
   - Time Complexity: $O(1)$, only constant number of arithmetic operations and comparisons.
   - Space Complexity: $O(1)$, only a few 64-bit integer variables.

## Code walkthrough
- `long long x = min(a, k);`: Calculate the cookies deducted from Takahashi's pile.
- `a -= x; k -= x;`: Deduct eaten cookies from Takahashi and reduce remaining operations.
- `long long y = min(b, k);`: Calculate cookies deducted from Aoki's pile with the remaining operations.
- `b -= y;`: Deduct from Aoki.
- `return {a, b};`: Return the final counts as a vector or pair.

## Test it out loud
- Test 1: `a = 0, b = 0, k = 0` $\to$ `x = 0, y = 0` $\to$ `[0, 0]`.
- Test 2: `a = 5, b = 0, k = 3` $\to$ `x = min(5, 3) = 3`, `a = 2, k = 0`, `y = 0` $\to$ `[2, 0]`.
- Test 3: `a = 5, b = 0, k = 9` $\to$ `x = min(5, 9) = 5`, `a = 0, k = 4`, `y = min(0, 4) = 0` $\to$ `[0, 0]`.
- Test 4: `a = 1, b = 1, k = 1` $\to$ `x = 1`, `a = 0, k = 0`, `y = 0` $\to$ `[0, 1]`.

## Follow-ups
- What if there are multiple friends with cookie piles in order $a_1, a_2, \dots, a_m$?
  We can process them in sequence: for each friend $i$, compute `take = min(a[i], k)`, subtract from `a[i]` and `k`. If `k == 0`, we can break early. This runs in $O(m)$ time.
- What if Takahashi eats cookies alternately between himself and Aoki?
  Compute full rounds using integer division `k / 2` and remainder `k % 2`, adjusting for whichever player runs out first.

## Common mistakes
- Using 32-bit signed integers (`int` in C++/Java), which overflow since numbers reach $10^{12}$. 64-bit integers (`long long` in C++, `long` in Java) are required.
- Running a loop of length $k$, causing Time Limit Exceeded.
- Subtracting $k$ directly without capping at $a$ or $b$, leading to negative cookie counts.
