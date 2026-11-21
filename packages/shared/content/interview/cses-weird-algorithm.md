---
id: cses-weird-algorithm
pattern: cses-introductory
difficulty: medium
optimal: "O(k) time and O(k) space, where k is the number of steps in the sequence"
brute: same
reviewed: false
---

## Clarify first
- What are the bounds on the initial integer $n$? It is a positive integer between $1$ and $10^6$.
- What is the termination condition? The sequence terminates as soon as $n$ reaches $1$.
- Should the returned sequence include the starting number $n$ and the final $1$? Yes, both should be present in order.
- Can values during intermediate steps exceed 32-bit signed integers? Yes, when multiplying an odd number by $3$ and adding $1$, intermediate values can overflow a 32-bit integer, so we must use 64-bit integers.

## Examples to say out loud
- Consider $n = 3$:
  - Initial value: append $3$.
  - $3$ is odd: $3 \times 3 + 1 = 10$.
  - $10$ is even: $10 / 2 = 5$.
  - $5$ is odd: $3 \times 5 + 1 = 16$.
  - $16$ is even: $16 / 2 = 8$.
  - $8$ is even: $8 / 2 = 4$.
  - $4$ is even: $4 / 2 = 2$.
  - $2$ is even: $2 / 2 = 1$.
  - Sequence: $[3, 10, 5, 16, 8, 4, 2, 1]$.
- Edge case: $n = 1$. Since $n$ is already $1$, the loop does not run. The output is simply $[1]$.

## Brute force
This problem is a direct simulation of the Collatz process. There is no alternative search space or combinatorial brute force to compare against. A naive attempt might try to precompute or search for mathematical closed-form patterns, but the Collatz sequence has no known shortcut. The baseline is direct simulation step-by-step.

## The key observation
The Collatz conjecture states that this process always terminates at $1$ for all positive integers. For $n \le 10^6$, the sequence reaches $1$ within a few hundred steps. The primary engineering detail is using a 64-bit integer for the running value to prevent integer overflow during the $3n + 1$ transformation.

## Optimal approach
1. Initialize a dynamic array of 64-bit integers and a working 64-bit variable $x = n$.
2. Append $x$ to the array.
3. While $x \ne 1$:
   - If $x$ is even, update $x = x / 2$.
   - If $x$ is odd, update $x = 3 \times x + 1$.
   - Append the updated $x$ to the array.
4. Return the resulting array.

Complexity:
- Time: $O(k)$, where $k$ is the sequence length (at most a few hundred operations for $n \le 10^6$).
- Space: $O(k)$ to store the output list, using $O(1)$ auxiliary space beyond the output.

## Code walkthrough
- `long long x = n`: Cast or assign the starting integer to a 64-bit variable to guard against arithmetic overflow in subsequent multiplication steps.
- `out.push_back(x)`: Record the starting integer before entering the loop.
- `while (x != 1)`: The loop condition guarantees termination precisely when the value reaches $1$.
- `x = (x % 2 == 0) ? x / 2 : 3 * x + 1`: Evaluates parity and applies the Collatz rule.
- `out.push_back(x)`: Append each newly computed value immediately.

## Test it out loud
- Test case $1$: $n = 1$. The loop condition `1 != 1` fails immediately; returns $[1]$.
- Test case $2$: $n = 2$. Starts with $2$, even step produces $1$, loop finishes; returns $[2, 1]$.
- Test case $3$: $n = 4$. Steps: $4 \to 2 \to 1$; returns $[4, 2, 1]$.
- Test case $4$: $n = 5$. Steps: $5 \to 16 \to 8 \to 4 \to 2 \to 1$; returns $[5, 16, 8, 4, 2, 1]$.

## Follow-ups
- What if we need to find the number in $1 \dots N$ that produces the longest Collatz chain? We can simulate each starting number and use memoization with a hash table or array to store the step count from previously computed numbers.
- Can this loop enter an infinite cycle? Under the Collatz conjecture, no starting positive integer has been found to diverge or cycle other than the trivial $4 \to 2 \to 1$ loop.

## Common mistakes
- Using 32-bit integers: When $n$ is around $10^6$, intermediate values can exceed $2^{31} - 1$, causing integer overflow and infinite loops or incorrect negative numbers.
- Forgetting to push the initial $n$: Starting the array empty and only pushing inside the loop will omit the initial number.
- Incorrect loop condition: Writing `while (x > 1)` works, but checking `while (x > 0)` without breaking on $1$ leads to an infinite cycle between $1 \to 4 \to 2 \to 1$.

## Further reading
- [Collatz Conjecture on Wikipedia](https://en.wikipedia.org/wiki/Collatz_conjecture)
