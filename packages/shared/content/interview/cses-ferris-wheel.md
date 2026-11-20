---
id: cses-ferris-wheel
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log n) time and O(1) space"
reviewed: false
---

## Clarify first
- What are the constraints per gondola? A gondola can carry at most 2 children, and the total weight of children in a gondola cannot exceed $x$.
- Is it guaranteed that every child can fit individually? Yes, the problem constraints guarantee that $1 \le \text{weights}[i] \le x$ for all $i$.
- What is the objective? Minimize the total number of gondolas needed so that all children can ride.
- What are the input constraints? $1 \le n \le 200000$ and $1 \le x, \text{weights}[i] \le 10^9$.

## Examples to say out loud
- Consider `weights = [7, 2, 3, 9]` and $x = 10$:
  - Sort weights: `[2, 3, 7, 9]`.
  - Lightest = 2, Heaviest = 9: $2 + 9 = 11 > 10$. The heaviest child (9) cannot pair with anyone (not even the lightest child). Child 9 rides alone in gondola 1.
  - Remaining: `[2, 3, 7]`.
  - Lightest = 2, Heaviest = 7: $2 + 7 = 9 \le 10$. They fit together in gondola 2.
  - Remaining: `[3]`. Child 3 rides alone in gondola 3.
  - Total gondolas: 3.
- Consider `weights = [5, 5, 5, 5]` and $x = 10$:
  - Pair $(5, 5)$ and $(5, 5) \implies 2$ gondolas.

## Brute force
A brute-force strategy would search all possible pairings of children to find a valid assignment that minimizes gondola count. Because there are $(n-1)!!$ possible pairings, brute force search is factorial and completely impossible for $n = 200000$. A greedy two-pointer strategy after sorting yields the optimal minimum in $O(n \log n)$ time.

## The key observation
Consider the heaviest child remaining in the pool. If that child cannot pair with the lightest available child because their combined weight exceeds $x$, then that child cannot pair with any other remaining child either, and must occupy a gondola alone.
If the heaviest child can pair with the lightest child, pairing them together is always optimal: pairing the heaviest child with anyone else uses up more capacity and can only restrict future pairings for the lighter children.

## Optimal approach
1. Sort the `weights` array in ascending order.
2. Initialize two pointers: $i = 0$ (lightest child) and $j = n - 1$ (heaviest child).
3. Initialize `gondolas = 0`.
4. While $i \le j$:
   - If $i < j$ and $\text{weights}[i] + \text{weights}[j] \le x$:
     - Pair the lightest child with the heaviest: increment $i$.
   - Regardless of whether a pairing occurred, the heaviest child takes this gondola: decrement $j$.
   - Increment `gondolas`.
5. Return `gondolas`.

Complexity:
- Time: $O(n \log n)$ due to sorting the weights array, followed by an $O(n)$ two-pointer scan.
- Space: $O(1)$ auxiliary space beyond the sorting stack.

## Code walkthrough
- `sort(weights.begin(), weights.end())`: Orders children from lightest to heaviest.
- `int i = 0, j = (int)weights.size() - 1`: Pointers to the lightest and heaviest available children.
- `if (i < j && weights[i] + weights[j] <= x) i++`: If the lightest child fits with the heaviest, include the lightest child in the current gondola by advancing $i$.
- `j--; gondolas++`: The heaviest child is placed in the gondola (either alone or paired) and $j$ moves inward.
- `while (i <= j)`: Ensures all children, including the final unpaired child when $i == j$, are allocated a gondola.

## Test it out loud
- Test case $1$: `weights = [2, 3, 7, 9]`, $x = 9$:
  - Sorted: `[2, 3, 7, 9]`.
  - $2 + 9 = 11 > 9 \implies 9$ alone (gondola 1).
  - $2 + 7 = 9 \le 9 \implies (2, 7)$ pair (gondola 2).
  - $3$ alone (gondola 3). Total = 3.
- Test case $2$: `weights = [10, 10, 10]`, $x = 10$: All children have weight equal to capacity $x$. Each must ride alone. Returns 3.
- Test case $3$: `weights = [1]`, $x = 5$: Single child $\implies$ 1 gondola.
- Test case $4$: `weights = [1, 2, 3, 4, 5, 6]`, $x = 7$: Pairs: $(1, 6), (2, 5), (3, 4) \implies 3$ gondolas.

## Follow-ups
- What if a gondola could carry up to $K$ children rather than at most 2? When $K > 2$, the problem generalizes to the Bin Packing Problem, which is strongly NP-hard.
- Can $\text{weights}[i] + \text{weights}[j]$ overflow a 32-bit signed integer? With $x \le 10^9$, the sum is at most $2 \times 10^9$, which fits inside a signed 32-bit integer ($2.14 \times 10^9$).

## Common mistakes
- Allowing more than two children per gondola: Greedily packing three or more children into a gondola violates the strict rule that a gondola holds at most two children.
- Strict inequality vs non-strict: Checking `< x` instead of `<= x` excludes valid combinations whose weight exactly matches capacity $x$.
- Off-by-one when $i == j$: Failing to run the loop when $i == j$ misses allocating a gondola for the last remaining child.

## Further reading
- [Bin Packing Problem on Wikipedia](https://en.wikipedia.org/wiki/Bin_packing_problem)
