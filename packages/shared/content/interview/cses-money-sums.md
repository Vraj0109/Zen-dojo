---
id: cses-money-sums
pattern: cses-dynamic-programming
difficulty: medium
optimal: "O(n \times \text{max\_sum} / 64) time and O(\text{max\_sum}) space"
reviewed: false
---

## Clarify first
- What are the inputs? An array of $n$ positive integer coin values.
- What should be returned? An array of all distinct positive sums that can be produced using some non-empty subset of the coins.
- How should the output be ordered? Sorted in strictly ascending order.
- Are duplicates allowed in the output? No, each reachable sum must be listed exactly once.
- What are the constraints? $1 \le n \le 100$, $1 \le \text{coins}[i] \le 1000$, and the sum of all coins will not exceed $100000$.

## Examples to say out loud
- Consider `coins = [4, 2, 5, 2]`:
  - 1 coin sums: 2, 4, 5.
  - 2 coin sums: $2+2=4$, $2+4=6$, $2+5=7$, $4+5=9$.
  - 3 coin sums: $2+2+4=8$, $2+2+5=9$, $2+4+5=11$.
  - 4 coin sums: $2+2+4+5=13$.
  - Unique sorted sums: `[2, 4, 5, 6, 7, 8, 9, 11, 13]`.
- Edge case: single coin `[3]` $\implies `[3]`$.
- All equal coins `[2, 2, 2]` $\implies `[2, 4, 6]`$.

## Brute force
A brute-force solution would generate all $2^n$ subsets and insert their sums into a set. For $n = 100$, $2^{100}$ is unfathomably large. Subset sum boolean dynamic programming evaluates all achievable sums up to $\sum c \le 100000$ in $O(n \times \sum c)$ operations. Using bitwise operations (`std::bitset`), we can parallelize 64 transitions into a single machine cycle.

## The key observation
This is the subset sum reachability problem.
Let a bitset `bs` of size $100001$ represent all reachable sums, where `bs[s] = 1` if sum $s$ can be formed by some subset of processed coins, and 0 otherwise.
- Base case: `bs[0] = 1` (the empty subset produces sum 0).
- When a coin of value $c$ is introduced, any previously reachable sum $s$ can now also produce $s + c$.
In bitwise representation, adding $c$ to every existing sum corresponds directly to a **left bitshift by $c$**!
Therefore, the entire transition across all sums up to $100000$ is simply:
$$\text{bs} \mid= (\text{bs} \ll c)$$
The CPU executes this bitwise OR in 64-bit word chunks, speeding up the loop by a factor of 64.

## Optimal approach
1. Initialize a `bitset<100001> bs` with `bs[0] = 1`.
2. Maintain a running maximum sum `maxSum = 0`.
3. For each coin $c$ in `coins`:
   - Update `bs |= (bs << c)`.
   - Add $c$ to `maxSum`.
4. Iterate $s$ from $1$ to `maxSum`:
   - If `bs[s] == 1`, append $s$ to the result array.
5. Return the result array.

Complexity:
- Time: $O(n \times \text{max\_sum} / 64)$. With $n = 100$ and $\text{max\_sum} \le 100000$, total bitwise operations $\approx 100 \times (100000 / 64) \approx 1.5 \times 10^5$, executing in under 1 millisecond.
- Space: $O(\text{max\_sum})$ bits, which takes only $100000 / 8 \approx 12.5$ KB of memory.

## Code walkthrough
- `bitset<100001> bs`: 100001-bit array holding reachability flags.
- `bs[0] = 1`: Empty set sum base case.
- `for (int c : coins) bs |= (bs << c)`: Bitshift by $c$ shifts all set bits upward by $c$ in parallel across 64-bit registers, and bitwise OR merges the newly reachable sums with previous sums.
- `for (int s = 1; s <= min(maxSum, 100000); s++) if (bs[s]) res.push_back(s)`: Gathers all reachable positive sums naturally in sorted order.

## Test it out loud
- Test case $1$: `coins = [1, 2]`. $bs$ becomes bits $\{0, 1, 2, 3\}$. Collects positive sums $\implies `[1, 2, 3]`$.
- Test case $2$: `coins = [2, 2, 2]`. Shifts by 2 three times: $\{0, 2\} \to \{0, 2, 4\} \to \{0, 2, 4, 6\}$. Returns `[2, 4, 6]`.
- Test case $3$: `coins = [1, 2, 4, 8]`. Generates all binary sums up to 15 $\implies 1 \dots 15$.

## Follow-ups
- How to write this in languages without a built-in `std::bitset` (like Java)? Use an array of 64-bit `long` words and implement the bitshift and OR manually, or use a boolean array iterating backwards from `currentMax` down to 0.
- In Python, how does this work? Python integers have arbitrary precision, so `bs` can be a single Python `int` updated with `bs |= (bs << c)`.

## Common mistakes
- Including 0 in the result: The problem requires sums formed by *non-empty* subsets, so 0 must be excluded.
- Running boolean array forward instead of backward (if not using bitset): Updating forward without a bitset allows a single coin to be added to itself multiple times in the same step.

## Further reading
- [Subset Sum Problem on Wikipedia](https://en.wikipedia.org/wiki/Subset_sum_problem)
