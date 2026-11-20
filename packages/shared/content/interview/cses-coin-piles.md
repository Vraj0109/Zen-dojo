---
id: cses-coin-piles
pattern: cses-introductory
difficulty: medium
optimal: "O(1) time and O(1) space"
reviewed: false
---

## Clarify first
- What moves are allowed? In one move, we can either remove 1 coin from the left pile and 2 coins from the right pile, or 2 coins from the left pile and 1 coin from the right pile.
- Can piles have negative coins? No, moves can only be performed if there are sufficient coins in both piles.
- What is the return value? `true` if both piles can be emptied simultaneously, `false` otherwise.
- What are the ranges of $a$ and $b$? $0 \le a, b \le 10^9$.

## Examples to say out loud
- Consider $a = 2, b = 1$:
  - Choose the move (2 from left, 1 from right): left becomes 0, right becomes 0. Both empty in 1 move. Return `true`.
- Consider $a = 2, b = 2$:
  - Total coins = 4. Since each move consumes 3 coins, 4 is not divisible by 3. Impossible. Return `false`.
- Consider $a = 3, b = 3$:
  - Total coins = 6 (divisible by 3).
  - Move 1: remove (1, 2) $\implies a = 2, b = 1$.
  - Move 2: remove (2, 1) $\implies a = 0, b = 0$.
  - Return `true`.
- Edge case: $a = 0, b = 0$: Already empty in 0 moves. Return `true`.

## Brute force
A brute-force solution would use recursion with memoization or breadth-first search to simulate moves from $(a, b)$ towards $(0, 0)$. However, with $a, b \le 10^9$, the state space contains billions of states, leading to Memory Limit Exceeded or Time Limit Exceeded. We can determine solvability algebraically in $O(1)$ time.

## The key observation
Let $x$ be the number of times we perform operation 1 (remove 1 from $a$, 2 from $b$) and $y$ be the number of times we perform operation 2 (remove 2 from $a$, 1 from $b$).
To empty both piles, the following system of linear equations must hold for non-negative integers $x, y \ge 0$:
$$a = x + 2y$$
$$b = 2x + y$$
Adding the two equations: $a + b = 3(x + y) \implies (a + b) \pmod 3 == 0$.
Solving for $x$ and $y$:
$$2a - b = 2(x + 2y) - (2x + y) = 3y \implies y = \frac{2a - b}{3} \ge 0 \implies 2a \ge b$$
$$2b - a = 2(2x + y) - (x + 2y) = 3x \implies x = \frac{2b - a}{3} \ge 0 \implies 2b \ge a$$
Thus, the necessary and sufficient conditions are: $(a + b) \pmod 3 == 0$, $a \le 2b$, and $b \le 2a$.

## Optimal approach
1. Check if $(a + b) \pmod 3 \ne 0$. If so, return `false`.
2. Check if $a \le 2b$ and $b \le 2a$, using 64-bit integer multiplication to avoid overflow when doubling.
3. Return `true` if all conditions hold, else `false`.

Complexity:
- Time: $O(1)$ constant time arithmetic operations.
- Space: $O(1)$ auxiliary space.

## Code walkthrough
- `if ((a + b) % 3 != 0) return false`: Verifies that the total coins can be partitioned into sets of 3.
- `return a <= 2LL * b && b <= 2LL * a`: The `2LL` literal promotes the multiplication to 64 bits, preventing 32-bit signed overflow when $a, b \approx 10^9$, and ensures neither pile is disproportionately larger than twice the other.

## Test it out loud
- Test case $1$: $a = 0, b = 0 \implies 0 \pmod 3 == 0, 0 \le 0, 0 \le 0 \implies \text{true}$.
- Test case $2$: $a = 1, b = 2 \implies 3 \pmod 3 == 0, 1 \le 4, 2 \le 2 \implies \text{true}$.
- Test case $3$: $a = 0, b = 1 \implies 1 \pmod 3 \ne 0 \implies \text{false}$.
- Test case $4$: $a = 8, b = 4 \implies 12 \pmod 3 == 0, 8 \le 8, 4 \le 16 \implies \text{true}$.
- Test case $5$: $a = 10, b = 2 \implies 12 \pmod 3 == 0$, but $10 \le 2(2) = 4$ is false $\implies \text{false}$.

## Follow-ups
- How would we output the sequence of moves? Solve for $x = \frac{2b - a}{3}$ and $y = \frac{2a - b}{3}$. Output move (1, 2) $x$ times, and move (2, 1) $y$ times.
- What if the moves were $(p, q)$ and $(q, p)$ for arbitrary positive constants $p$ and $q$? Solve the corresponding $2 \times 2$ determinant system for $x, y \ge 0$ and verify non-negative integer solutions.

## Common mistakes
- 32-bit overflow on $2 \times a$ or $2 \times b$: When $a = 10^9$, $2a$ can exceed $2^{31} - 1$ if signed 32-bit arithmetic wraps around, causing false positives or negatives.
- Only checking $(a + b) \pmod 3 == 0$: For $a = 12, b = 0$, the sum is 12 (divisible by 3), but we cannot empty them because one pile is 0. Both pile ratio constraints must be verified.

## Further reading
- [System of Linear Equations on Wikipedia](https://en.wikipedia.org/wiki/System_of_linear_equations)
