---
id: cses-number-spiral
pattern: cses-introductory
difficulty: medium
optimal: "O(1) time and O(1) space"
reviewed: false
---

## Clarify first
- How is the infinite grid defined? Cell $(1, 1)$ contains 1. Layer $z = \max(y, x)$ encompasses all cells where the maximum coordinate is $z$.
- Are the coordinates 1-indexed? Yes, row $y$ and column $x$ are 1-indexed.
- What are the ranges of $y$ and $x$? Between $1$ and $10^9$.
- Can the answer exceed standard 32-bit integer limits? Yes, for $y, x = 10^9$, the value can reach $10^{18}$, so 64-bit integer arithmetic is required.

## Examples to say out loud
- Consider $y = 2, x = 3$:
  - Layer $z = \max(2, 3) = 3$.
  - Since $z = 3$ is odd, the numbers in layer 3 increase along row 1 to column 3, then downwards along column 3.
  - The inner square of size $z - 1 = 2$ contains $(2)^2 = 4$ numbers.
  - Layer 3 numbers start at $4 + 1 = 5$ at $(1, 3)$, $6$ at $(2, 3)$, and so on.
  - Wait, let's verify odd layer orientation:
    - Layer 1: $(1, 1) = 1$.
    - Layer 2 (even): down along col 2, then left along row 2: $(1, 2) = 2$, $(2, 2) = 3$, $(2, 1) = 4$. Row 2 ends at $(2, 1) = 4 = 2^2$.
    - Layer 3 (odd): right along row 3, then up along col 3, or down along col 3?
    - Notice $(3, 1) = 5$, $(3, 2) = 6$, $(3, 3) = 7$, $(2, 3) = 8$, $(1, 3) = 9$.
    - Here $(2, 3) = 8$ matches Example 1.
- Edge case: $y = 1, x = 1 \implies z = 1$, $z$ is odd, $x = z$, returns $1^2 - 1 + 1 = 1$.

## Brute force
A brute-force solution would allocate memory and simulate filling the spiral step-by-step up to the requested coordinate. Because coordinates can reach $10^9$, simulating $10^{18}$ cells would take decades of compute time and gigabytes of memory. A constant-time mathematical formula resolves the query directly.

## The key observation
Every cell $(y, x)$ lies on the outer boundary of a square of size $z = \max(y, x)$. The previous fully populated square of size $z - 1$ contains $(z - 1)^2$ numbers. The outer layer contains $2z - 1$ numbers, ending at $z^2$:
- If $z$ is even, values wrap such that the sequence moves down along column $z$ from $(1, z)$ to $(z, z)$, then left along row $z$ to $(z, 1)$ which holds $z^2$.
  - If $y == z$, we are on row $z$, distance $x - 1$ from the end, so value is $z^2 - x + 1$.
  - If $y < z$, we are on column $z$, distance $y$ from the start of layer $z$, so value is $(z - 1)^2 + y$.
- If $z$ is odd, values wrap such that row $z$ comes first from $(z, 1)$ to $(z, z)$, then up column $z$ to $(1, z)$ which holds $z^2$.
  - If $x == z$, we are on column $z$, so value is $z^2 - y + 1$.
  - If $x < z$, we are on row $z$, so value is $(z - 1)^2 + x$.

## Optimal approach
1. Compute layer $z = \max(y, x)$ using 64-bit integers.
2. Compute the base value $(z - 1)^2$.
3. Check the parity of $z$:
   - If $z$ is even:
     - If $y == z$, return $z^2 - x + 1$.
     - Otherwise, return $(z - 1)^2 + y$.
   - If $z$ is odd:
     - If $x == z$, return $z^2 - y + 1$.
     - Otherwise, return $(z - 1)^2 + x$.

Complexity:
- Time: $O(1)$ arithmetic operations.
- Space: $O(1)$ auxiliary space.

## Code walkthrough
- `long long z = max(y, x)`: Identifies which square boundary layer contains the target coordinate.
- `long long z2 = (z - 1) * (z - 1)`: The count of elements fully enclosed inside the preceding $(z - 1) \times (z - 1)$ square.
- `if (z % 2 == 0)`: Distinguishes between clockwise and counter-clockwise layer indexing.
- `(y == z) ? z * z - x + 1 : z2 + y`: Computes offset along the row or column based on where the maximum coordinate lies.

## Test it out loud
- Test case $1$: $y = 1, x = 3$. $z = 3$ (odd), $x == z \implies 3^2 - 1 + 1 = 9$.
- Test case $2$: $y = 3, x = 1$. $z = 3$ (odd), $x \ne z \implies 2^2 + 1 = 5$.
- Test case $3$: $y = 3, x = 3$. $z = 3$ (odd), $x == z \implies 3^2 - 3 + 1 = 7$.
- Test case $4$: $y = 4, x = 4$. $z = 4$ (even), $y == z \implies 4^2 - 4 + 1 = 13$.

## Follow-ups
- How would we handle multiple queries efficiently? Since each query is $O(1)$, answering $Q$ queries takes $O(Q)$ time, which is optimal.
- What if the coordinates are 0-indexed? Adjusting input coordinates by adding 1 maps directly to the 1-indexed formula.

## Common mistakes
- Integer overflow: Multiplying $z \times z$ when $z \approx 10^9$ yields up to $10^{18}$, which overflows a 32-bit signed integer. All intermediate values and return types must be 64-bit (`long long`).
- Swapping odd and even parity logic: Confusing whether even layers end at $(z, 1)$ or $(1, z)$ produces inverted results across alternating diagonals.

## Further reading
- [Ulam Spiral and Grid Coordinates on Wikipedia](https://en.wikipedia.org/wiki/Ulam_spiral)
