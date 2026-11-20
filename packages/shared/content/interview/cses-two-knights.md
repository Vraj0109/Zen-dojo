---
id: cses-two-knights
pattern: cses-introductory
difficulty: medium
optimal: "O(n) time and O(n) space"
reviewed: false
---

## Clarify first
- What are we counting? For each board size $k \times k$ from $k = 1$ to $n$, count the number of ways two identical knights can be placed so that they do not attack each other.
- Are the two knights distinguishable? No, placing two knights on squares $A$ and $B$ is the same as placing them on $B$ and $A$ (unordered pairs).
- What are the constraints on $n$? $1 \le n \le 10000$.
- Can the answer exceed 32-bit integers? Yes, for $k = 10000$, total pairs on the board are approximately $\frac{10^8 \times 10^8}{2} = 5 \times 10^{15}$, requiring 64-bit integers.

## Examples to say out loud
- For $k = 1$: Board has 1 square. Impossible to place two knights. Placements = 0.
- For $k = 2$: Board has $2 \times 2 = 4$ squares. Total pairs = $\binom{4}{2} = \frac{4 \times 3}{2} = 6$. Knights on a $2 \times 2$ board cannot attack each other (requires an $L$-shape of $2 \times 1$). Non-attacking placements = 6.
- For $k = 3$: Board has $3 \times 3 = 9$ squares. Total pairs = $\binom{9}{2} = 36$.
  - A knight attack pattern spans a $2 \times 3$ or $3 \times 2$ rectangle.
  - A $3 \times 3$ board contains two $2 \times 3$ blocks and two $3 \times 2$ blocks (total 4 blocks).
  - Each block has 2 attacking pairs of knights (the two opposite corners).
  - Total attacking pairs = $4 \times 2 = 8$.
  - Valid placements = $36 - 8 = 28$.

## Brute force
A brute force approach would iterate over all pairs of squares $(r_1, c_1)$ and $(r_2, c_2)$ on a $k \times k$ board, check if their coordinate differences satisfy $(|\Delta r| = 1 \land |\Delta c| = 2)$ or $(|\Delta r| = 2 \land |\Delta c| = 1)$, and count non-attacking pairs. For a board of size $k$, there are $O(k^4)$ pairs. Over all $k$ from $1$ to $n$, this would require $O(n^5)$ time, which TLEs even for $n = 50$. We can solve each $k$ in $O(1)$ arithmetic operations.

## The key observation
We can count valid configurations using complementary counting:
$$\text{Valid} = \text{Total Pairs} - \text{Attacking Pairs}$$
1. Total ways to place two knights on $k^2$ squares is:
   $$\text{Total} = \binom{k^2}{2} = \frac{k^2(k^2 - 1)}{2}$$
2. Two knights attack each other if and only if they occupy diagonally opposite corners of a $2 \times 3$ or $3 \times 2$ subgrid.
3. Each $2 \times 3$ subgrid contains exactly 2 attacking knight pairs. The number of $2 \times 3$ subgrids on a $k \times k$ board is $(k - 1)(k - 2)$.
4. By symmetry, the number of $3 \times 2$ subgrids is $(k - 2)(k - 1)$, each also containing 2 attacking pairs.
5. Therefore, the total number of attacking pairs is:
   $$2 \times (k - 1)(k - 2) + 2 \times (k - 2)(k - 1) = 4(k - 1)(k - 2)$$
This yields a closed-form formula for each $k$ in $O(1)$ time.

## Optimal approach
1. Allocate an array `res` of size $n$.
2. For each $k$ from $1$ to $n$:
   - Calculate $\text{total} = \frac{k^2(k^2 - 1)}{2}$ using 64-bit integer arithmetic.
   - Calculate $\text{attack} = 4(k - 1)(k - 2)$.
   - Append $\text{total} - \text{attack}$ to `res`.
3. Return `res`.

Complexity:
- Time: $O(n)$ because we evaluate a constant number of arithmetic operations for each $k$ from $1$ to $n$.
- Space: $O(n)$ to store and return the result array.

## Code walkthrough
- `vector<long long> res`: Stores the 64-bit answers for each board size.
- `for (long long k = 1; k <= n; k++)`: Loops through all chessboard dimensions from $1 \times 1$ up to $n \times n$.
- `long long total = (k * k) * (k * k - 1) / 2`: Uses `long long` for $k$ to avoid overflow during intermediate multiplications like $k^4$.
- `long long attack = 4 * (k - 1) * (k - 2)`: Counts all attacking knight pairs via $2 \times 3$ and $3 \times 2$ rectangles. When $k = 1$ or $k = 2$, this formula evaluates to $0$ or negative values (handled naturally because $k - 1$ or $k - 2$ is zero/negative, but for $k = 1$: $4(0)(-1) = 0$; wait, when $k = 1$, $k - 1 = 0 \implies \text{attack} = 0$, correct).
- `res.push_back(total - attack)`: Stores the valid placements.

## Test it out loud
- Test case $1$: $k = 1 \implies \text{total} = 0$, $\text{attack} = 0 \implies 0$.
- Test case $2$: $k = 2 \implies \text{total} = \frac{4 \times 3}{2} = 6$, $\text{attack} = 4(1)(0) = 0 \implies 6$.
- Test case $3$: $k = 3 \implies \text{total} = \frac{9 \times 8}{2} = 36$, $\text{attack} = 4(2)(1) = 8 \implies 28$.
- Test case $4$: $k = 4 \implies \text{total} = \frac{16 \times 15}{2} = 120$, $\text{attack} = 4(3)(2) = 24 \implies 96$.

## Follow-ups
- What if there were three knights instead of two? Complementary counting becomes more complex via the Principle of Inclusion-Exclusion, as we must account for overlapping attack paths.
- Can we answer a single query for an arbitrary large $k$ like $k = 10^9$? Yes, the closed-form formula runs in $O(1)$ time and $O(1)$ space for any individual $k$.

## Common mistakes
- 32-bit integer overflow: $k^4$ for $k = 10000$ is $10^{16}$, which overflows a 32-bit integer by multiple orders of magnitude.
- Counting individual squares attacked per knight: Trying to calculate knight mobility on borders vs center is error-prone, whereas counting subgrid rectangles eliminates boundary casework entirely.

## Further reading
- [Knight's Move Properties on Wikipedia](https://en.wikipedia.org/wiki/Knight_(chess))
