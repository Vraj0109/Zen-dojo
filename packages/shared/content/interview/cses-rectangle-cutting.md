---
id: cses-rectangle-cutting
pattern: cses-dynamic-programming
difficulty: medium
optimal: "O(a \times b \times (a + b)) time and O(a \times b) space"
reviewed: false
---

## Clarify first
- What are the dimensions of the rectangle? An $a \times b$ rectangle where $1 \le a, b \le 500$.
- What operations are allowed? A straight cut from one side to the opposite side, either horizontally or vertically, dividing a piece into two smaller rectangles.
- What is the termination condition? When all resulting pieces are squares.
- What is the objective? Find the minimum total number of cuts required.

## Examples to say out loud
- Consider $a = 3, b = 5$:
  - Cut 1: Vertical cut separating a $3 \times 3$ square and a $3 \times 2$ rectangle.
  - Cut 2: Cut $3 \times 2$ into a $2 \times 2$ square and a $1 \times 2$ rectangle.
  - Cut 3: Cut $1 \times 2$ into two $1 \times 1$ squares.
  - Total cuts = 3.
- Edge case: $a = b$ (e.g. $4 \times 4$):
  - The rectangle is already a square, requiring 0 cuts.
- Edge case: $a = 1, b = 5$:
  - Cutting $1 \times 5$ into five $1 \times 1$ squares takes 4 cuts.

## Brute force
A brute-force solution would recursively try every possible horizontal and vertical cut position without memoization. Because branching factor at each step is $(a - 1) + (b - 1)$, recursion tree grows super-exponentially. Dynamic programming evaluates each sub-rectangle $(w, h)$ exactly once in $O(w + h)$ transitions.

## The key observation
Let $\text{dp}[w][h]$ denote the minimum number of cuts needed to partition a rectangle of width $w$ and height $h$ into squares.
- If $w == h$: the rectangle is already a square, so $\text{dp}[w][h] = 0$.
- If $w \ne h$: any first cut must be either:
  1. A vertical cut at width $k$ ($1 \le k < w$), splitting into $k \times h$ and $(w - k) \times h$, requiring $\text{dp}[k][h] + \text{dp}[w - k][h] + 1$ cuts.
  2. A horizontal cut at height $k$ ($1 \le k < h$), splitting into $w \times k$ and $w \times (h - k)$, requiring $\text{dp}[w][k] + \text{dp}[w][h - k] + 1$ cuts.
The minimum over all possible vertical and horizontal cut positions yields the optimal answer. Because cuts are symmetric, $\text{dp}[w][h] = \text{dp}[h][w]$.

## Optimal approach
1. Allocate a 2D array `dp` of size $(a + 1) \times (b + 1)$ initialized to 0.
2. Iterate $w$ from $1$ to $a$:
   - Iterate $h$ from $1$ to $b$:
     - If $w == h$: $\text{dp}[w][h] = 0$, continue.
     - Initialize `best = 1e9`.
     - Try vertical cuts: for $k = 1$ to $w - 1$:
       - `best = min(best, dp[k][h] + dp[w - k][h] + 1)`.
     - Try horizontal cuts: for $k = 1$ to $h - 1$:
       - `best = min(best, dp[w][k] + dp[w][h - k] + 1)`.
     - Set $\text{dp}[w][h] = \text{best}$.
3. Return $\text{dp}[a][b]$.

Complexity:
- Time: $O(a \times b \times (a + b))$. For $a, b \le 500$, total inner loop iterations $\approx 500 \times 500 \times 250 \approx 6.2 \times 10^7$, executing in $\approx 150$ ms in C++.
- Space: $O(a \times b)$ to store the 2D DP matrix ($500 \times 500 \times 4$ bytes $\approx 1$ MB).

## Code walkthrough
- `vector<vector<int>> dp(a + 1, vector<int>(b + 1, 0))`: Stores optimal cut counts for subproblems.
- `if (w == h) { dp[w][h] = 0; continue; }`: Base case: squares require 0 cuts.
- `for (int k = 1; k < w; k++) best = min(best, dp[k][h] + dp[w - k][h] + 1)`: Explores all vertical divide lines.
- `for (int k = 1; k < h; k++) best = min(best, dp[w][k] + dp[w][h - k] + 1)`: Explores all horizontal divide lines.
- `dp[w][h] = best`: Records the minimum cut count.

## Test it out loud
- Test case $1$: $a = 1, b = 1 \implies 0$ cuts.
- Test case $2$: $a = 1, b = 5 \implies$ only horizontal cuts possible, gives $1 + 1 + 1 + 1 = 4$ cuts.
- Test case $3$: $a = 2, b = 3 \implies$ cut at $k = 2$ gives $2 \times 2$ (0 cuts) and $2 \times 1$ (1 cut), total $0 + 1 + 1 = 2$ cuts.
- Test case $4$: $a = 4, b = 6 \implies 2$ cuts ($4 \times 6 \to 4 \times 4$ and $4 \times 2 \to 2 \times 2, 2 \times 2$).

## Follow-ups
- Why does a greedy strategy (cutting the largest possible square first) fail? For example, with $11 \times 13$, greedy cuts $11 \times 11$, leaving $11 \times 2$, which takes multiple further cuts. An optimal partition cuts differently to yield fewer total squares.
- Can we exploit symmetry to halve the inner loop iterations? Yes, since $k$ and $w - k$ are symmetric, looping $k$ up to $w / 2$ and $h / 2$ cuts runtime by half.

## Common mistakes
- Assuming greedy largest-square cut works: The classic Euclidean algorithm / greedy cutting does not minimize the total number of squares for general rectangles.
- Off-by-one in loop ranges: Looping $k$ from $1$ to $w$ instead of $w - 1$ leads to infinite recursion or referencing $\text{dp}[0][h]$.

## Further reading
- [Tiling with Rectangles and Squares on Wikipedia](https://en.wikipedia.org/wiki/Squaring_the_square)
