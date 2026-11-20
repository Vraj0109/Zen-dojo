---
id: cses-josephus-queries
pattern: cses-range-tree-math-string
difficulty: medium
optimal: "O(q log n) time, O(log n) space where q is queries.length"
reviewed: false
---

## Clarify first
- How are children numbered? 1 through `n` in circular order.
- What is the elimination order? Starting at child 1, every second child is removed: first child 2, then child 4, etc.
- What does each query ask for? For a pair `[n, k]`, return the number of the child eliminated at step `k`.
- What are the constraints on `n` and `k`? `k <= n <= 10^9`, and up to `10^5` queries.

## Examples to say out loud
- Consider `n = 7, k = 1`:
  - First child removed is 2.
- Consider `n = 7, k = 3`:
  - Sequence of evens removed on first lap: 2 (step 1), 4 (step 2), 6 (step 3). Child removed is 6.
- Consider `n = 2, k = 2`:
  - First step removes child 2. Child 1 remains and is removed at step 2. Returns 1.
- Consider `n = 7, k = 4`:
  - Circle has 7 children. First lap removes 2, 4, 6. Next to be counted is 7 (skipped), and child 1 is removed. Returns 1.

## Brute force
Simulating the circle using a linked list or Fenwick tree takes `O(n log n)` per query. Since `n <= 10^9`, any direct simulation is impossible. We must answer each query mathematically in logarithmic time.

## The key observation
On the first pass around the circle:
- All even numbers `2, 4, 6, ...` up to `n` are removed.
- There are `floor(n / 2)` such evens.
If `2 * k <= n`, the child removed at step `k` is simply `2 * k`.
If `n` is odd and `k = (n + 1) / 2`, after passing `n` (which is skipped), the very next removed child is 1.
Otherwise, if `k > (n + 1) / 2`, all first-lap removals are complete. The remaining `n / 2` children can be remapped to a smaller Josephus instance of size `n / 2`. Solving recursively and mapping the subproblem index back restores the answer: if `n` was odd, the remaining children shift to `2 * res + 1`; if `n` was even, they shift to `2 * res - 1`.

## Optimal approach
1. Define a recursive helper function `solve(n, k)`:
   - Base case: If `n == 1`, return 1.
   - If `k <= (n + 1) / 2`:
     - If `2 * k > n`, return 1 (this handles the odd wrap-around where child 1 is eliminated).
     - Otherwise return `2 * k`.
   - If `k > (n + 1) / 2`:
     - Eliminate the first `(n + 1) / 2` removals and recurse on size `n / 2`: `temp = solve(n / 2, k - (n + 1) / 2)`.
     - If `n` is odd, return `2 * temp + 1`.
     - If `n` is even, return `2 * temp - 1`.
2. For each query `[n, k]`, evaluate `solve(n, k)` and collect into an answer list.
3. Return the result list.

Complexity:
- Time: `O(q log n)` time because each query halves `n` at each recursive level, requiring `O(log n)` steps per query.
- Space: `O(log n)` auxiliary call stack space per query.

## Code walkthrough
- `if (n == 1) return 1;` handles the base case when only one person exists.
- `if (k <= (n + 1) / 2)` checks if the `k`-th removal occurs during the initial pass or immediate wrap-around.
- `temp = solve(n / 2, k - (n + 1) / 2);` reduces the problem to the surviving circle.
- `if (n % 2 == 1) return 2 * temp + 1; else return 2 * temp - 1;` accounts for the parity parity shift after the first round.

## Test it out loud
- Test `n = 1, k = 1`: Returns 1.
- Test `n = 2, k = 1`: `2 * 1 <= 2`, returns 2.
- Test `n = 2, k = 2`: Recurses to `solve(1, 1) = 1`, `n` is even, returns `2 * 1 - 1 = 1`.
- Test `n = 7, k = 4`: `k = 4 <= (7 + 1) / 2 = 4`. `2 * 4 = 8 > 7`, returns 1.
- Test `n = 7, k = 7`: Last child removed from circle of 7, correctly traces through subproblem to return 7.

## Follow-ups
- How does this differ from the classic Josephus problem?
  - Classic Josephus asks only for the final surviving child (`k = n`), which has the closed-form bit-rotation formula `2 * (n - 2^L) + 1`. This problem queries arbitrary intermediate elimination steps `k`.
- Can this recursion be converted to an iterative loop?
  - Yes, by recording the transformation path and unwinding iteratively in `O(1)` space.

## Common mistakes
- Miscalculating parity when `n` is odd, forgetting that the last odd number wraps around and skips child 1.
- Using 1-indexed versus 0-indexed formulas inconsistently during remapping.
