---
id: cses-book-shop
pattern: cses-dynamic-programming
difficulty: medium
optimal: "O(n \times \text{maxPrice}) time and O(\text{maxPrice}) space"
reviewed: false
---

## Clarify first
- What are the inputs? Two arrays of length $n$: `prices` (cost of each book) and `pages` (page count of each book), along with integer `maxPrice` (your budget).
- How many times can each book be bought? At most once (0/1 knapsack).
- What is the objective? Maximize the total number of pages bought without exceeding `maxPrice`.
- What are the constraints? $1 \le n \le 1000$, $1 \le \text{maxPrice} \le 100000$, and $1 \le \text{prices}[i], \text{pages}[i] \le 1000$.

## Examples to say out loud
- Consider `prices = [4, 8, 5, 3]`, `pages = [5, 12, 8, 1]`, and `maxPrice = 10`:
  - Book 0: price 4, pages 5
  - Book 1: price 8, pages 12
  - Book 2: price 5, pages 8
  - Book 3: price 3, pages 1
  - Choices:
    - Books 0 and 2: cost $4 + 5 = 9 \le 10$, total pages $5 + 8 = 13$.
    - Book 1 alone: cost $8 \le 10$, total pages 12.
    - Books 0, 2, 3: cost $4 + 5 + 3 = 12 > 10$ (exceeds budget).
  - Maximum pages = 13.
- Edge case: every book exceeds `maxPrice`:
  - `prices = [2, 3, 5]`, `pages = [10, 20, 40]`, `maxPrice = 1` $\implies$ return 0.

## Brute force
A brute force approach would explore all $2^n$ subsets of books via recursion, calculate total cost and pages for each subset, and find the maximum valid page count. With $n = 1000$, $2^{1000}$ subsets is astronomically large. Standard 0/1 knapsack dynamic programming evaluates the maximum value in $O(n \times \text{maxPrice})$ time.

## The key observation
This is the classic 0/1 Knapsack Problem where book prices represent item weights, page counts represent item values, and `maxPrice` is the knapsack capacity.
Let $\text{dp}[j]$ be the maximum pages obtainable with total cost at most $j$.
When considering a book with price $p$ and pages $pg$:
- If we do not buy the book: $\text{dp}[j]$ remains $\text{dp}[j]$.
- If we buy the book: we can obtain $\text{dp}[j - p] + pg$ pages.
Taking the maximum: $\text{dp}[j] = \max(\text{dp}[j], \text{dp}[j - p] + pg)$.
To ensure each book is bought **at most once**, the capacity $j$ must iterate **backwards** from `maxPrice` down to $p$. This prevents a book from being used multiple times in the same step.

## Optimal approach
1. Allocate an array `dp` of size `maxPrice + 1` initialized to 0.
2. For each book $i$ from $0$ to $n - 1$:
   - Let $p = \text{prices}[i]$ and $pg = \text{pages}[i]$.
   - Iterate $j$ backwards from `maxPrice` down to $p$:
     - $\text{dp}[j] = \max(\text{dp}[j], \text{dp}[j - p] + pg)$.
3. Return `dp[maxPrice]`.

Complexity:
- Time: $O(n \times \text{maxPrice})$. With $n \le 1000$ and $\text{maxPrice} \le 100000$, total operations $\le 10^8$, which finishes in $\approx 150$ ms in C++.
- Space: $O(\text{maxPrice})$ using the 1D space-optimized DP array ($10^5 \times 4$ bytes $\approx 400$ KB).

## Code walkthrough
- `vector<int> dp(maxPrice + 1, 0)`: 1D array representing maximum pages for every budget capacity from 0 to `maxPrice`.
- `for (int i = 0; i < n; i++)`: Iterates through each book sequentially.
- `for (int j = maxPrice; j >= p; j--)`: Critical backward loop ensuring each book is considered at most once.
- `dp[j] = max(dp[j], dp[j - p] + pg)`: Transitions state by comparing the choice of excluding vs including the current book.
- `return dp[maxPrice]`: Maximum pages possible with budget `maxPrice`.

## Test it out loud
- Test case $1$: `prices = [5]`, `pages = [10]`, `maxPrice = 5`. Returns 10.
- Test case $2$: `prices = [5]`, `pages = [10]`, `maxPrice = 4`. Budget insufficient $\implies$ returns 0.
- Test case $3$: `prices = [1, 2, 3]`, `pages = [10, 20, 30]`, `maxPrice = 5`. Books 2 and 3 cost $2 + 3 = 5$, pages $20 + 30 = 50$. Returns 50.
- Test case $4$: `prices = [2, 3, 4, 5]`, `pages = [3, 4, 5, 6]`, `maxPrice = 5`. Books 0 and 1 cost $2 + 3 = 5$, pages $3 + 4 = 7$. Returns 7.

## Follow-ups
- What if each book could be bought multiple times? Iterate $j$ **forwards** from $p$ to `maxPrice` (unbounded knapsack).
- What if maxPrice was up to $10^9$ but pages were small ($\sum \text{pages} \le 10^5$)? Invert the DP state: let $\text{dp}[v]$ be the minimum cost to achieve $v$ pages, solving in $O(n \times \sum \text{pages})$.

## Common mistakes
- Iterating $j$ forward: Running $j$ from $p$ to `maxPrice` allows the current book to be bought multiple times, turning 0/1 knapsack into unbounded knapsack.
- Allocating a full $2D$ DP array `dp[1000][100000]`: A $1000 \times 100000$ 32-bit integer matrix requires $\approx 400$ MB of memory, risking Memory Limit Exceeded. Compressing to a 1D array uses only $\approx 400$ KB.

## Further reading
- [0/1 Knapsack Problem on Wikipedia](https://en.wikipedia.org/wiki/Knapsack_problem)
