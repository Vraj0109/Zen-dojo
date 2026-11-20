---
id: cses-missing-number
pattern: cses-introductory
difficulty: medium
optimal: "O(n) time and O(1) space"
reviewed: false
---

## Clarify first
- What are the dimensions and ranges? We are given an integer $n$ ($2 \le n \le 200000$) and an array of $n - 1$ distinct integers chosen from $1$ through $n$.
- Is the array sorted? No, the array can arrive in arbitrary order.
- Can there be duplicates? No, all numbers present are unique and exactly one number in $1 \dots n$ is missing.
- Should we be mindful of integer overflow? Yes, for $n = 2 \times 10^5$, the sum of numbers from $1$ to $n$ is roughly $2 \times 10^{10}$, which exceeds the range of a 32-bit signed integer.

## Examples to say out loud
- Consider $n = 5$ and $\text{nums} = [2, 3, 1, 5]$:
  - The expected sum of numbers from $1$ to $5$ is $\frac{5 \times 6}{2} = 15$.
  - The sum of elements present in the list is $2 + 3 + 1 + 5 = 11$.
  - The difference is $15 - 11 = 4$, which is the missing number.
- Boundary example: $n = 2$ and $\text{nums} = [1]$:
  - Expected sum is $\frac{2 \times 3}{2} = 3$.
  - Actual sum is $1$. Missing number is $3 - 1 = 2$.

## Brute force
A brute-force strategy would be to sort the array in $O(n \log n)$ time and scan for the gap where $\text{nums}[i] \ne i + 1$. Alternatively, we could insert all numbers into a boolean array or hash set in $O(n)$ time and $O(n)$ space, then check which index from $1$ to $n$ was never marked. We can improve both time and space to $O(n)$ time and $O(1)$ extra space without modifying the input array.

## The key observation
The sum of all integers from $1$ through $n$ has a well-known closed formula: $\frac{n(n + 1)}{2}$. Since exactly one integer from this sequence is omitted in $\text{nums}$, subtracting every element present in $\text{nums}$ from this total yields the missing integer directly. Alternatively, bitwise XOR over $1 \dots n$ and all elements in $\text{nums}$ achieves the same result without risk of integer overflow.

## Optimal approach
1. Compute the expected sum of $1 \dots n$ using the formula $\text{total} = \frac{n \times (n + 1)}{2}$. Use a 64-bit integer to prevent overflow.
2. Iterate through each element $x$ in $\text{nums}$ and subtract $x$ from $\text{total}$.
3. Return the remaining value of $\text{total}$ cast to an integer.

Complexity:
- Time: $O(n)$ because we iterate through the list of length $n - 1$ exactly once.
- Space: $O(1)$ auxiliary space as we only store a scalar accumulator.

## Code walkthrough
- `long long total = (long long)n * (n + 1) / 2`: Computes the arithmetic series sum using 64-bit arithmetic to avoid 32-bit overflow when $n = 200000$.
- `for (int x : nums) total -= x`: Sequentially deducts each observed integer from the expected sum.
- `return (int)total`: The remaining value is guaranteed to be the single missing integer between $1$ and $n$.

## Test it out loud
- Test case $1$: $n = 2$, $\text{nums} = [1]$. Total is $3$. Subtract $1 \implies 2$.
- Test case $2$: $n = 2$, $\text{nums} = [2]$. Total is $3$. Subtract $2 \implies 1$.
- Test case $3$: $n = 3$, $\text{nums} = [3, 1]$. Total is $6$. Subtract $3$ then $1 \implies 2$.
- Test case $4$: $n = 6$, $\text{nums} = [1, 2, 3, 4, 5]$. Total is $21$. Sum is $15$. Missing is $6$.

## Follow-ups
- How to solve without any risk of 64-bit integer overflow? We can compute the cumulative XOR: initialize $\text{ans} = 0$, XOR all numbers from $1$ to $n$, and XOR all numbers in the array. Since $x \oplus x = 0$ and $x \oplus 0 = x$, every paired number cancels out, leaving only the missing number.
- What if two numbers were missing instead of one? The difference between expected and actual sums gives $a + b$, and the difference between sum of squares gives $a^2 + b^2$, which forms a solvable system of equations.

## Common mistakes
- 32-bit integer overflow: Computing $n \times (n + 1)$ for $n = 200000$ results in $40000200000$, which wraps around in 32-bit signed arithmetic if not explicitly cast to 64 bits.
- Array indexing out-of-bounds: Iterating up to index $n$ instead of $n - 1$, since the list contains only $n - 1$ items.
- Off-by-one in the upper limit: Using $\frac{(n-1)n}{2}$ instead of the formula up to $n$.

## Further reading
- [Arithmetic Progression Sum on Wikipedia](https://en.wikipedia.org/wiki/Arithmetic_progression)
