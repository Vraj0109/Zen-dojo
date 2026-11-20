---
id: c-kattis-planina
pattern: cses-kattis
difficulty: easy
optimal: "O(1) time, O(1) space"
reviewed: false
---

## Clarify first

- What is the starting shape? (A single square with its 4 corner vertices marked, so there are 4 points at step 0).
- What operation is performed in each step? (In each step, mark the midpoint of every edge of every existing small square and the center of every square; each square splits into 4 smaller squares).
- Are overlapping or existing points counted multiple times? (No, points that are already marked are only counted once).
- What are the constraints on $n$? ($0 \le n \le 15$).
- What should be returned? (The total count of distinct marked points on the grid after $n$ iterations).

## Examples to say out loud

- Step 0: `n = 0`. The original square has 4 corner points. Output is 4.
- Step 1: `n = 1`. Splitting the square into $2 \times 2 = 4$ smaller squares creates a $3 \times 3$ grid of points. Total points: $3 \times 3 = 9$. Output is 9.
- Step 2: `n = 2`. Each of the 4 squares splits into 4 smaller squares, yielding a $4 \times 4$ square grid with $5 \times 5$ points. Total points: $5 \times 5 = 25$. Output is 25.

## Brute force

A geometric simulation maintains a set of coordinate pairs $(x, y)$. In each step, for every square, calculate the coordinates of edge midpoints and center points, inserting them into the set. Because the number of points grows exponentially with $n$, simulating point insertions into a set requires allocating memory and performing thousands of operations. For $n \le 15$, this is unnecessary because the geometry follows an exact closed-form relation.

## The key observation

The points always form a uniform 2D Cartesian grid of points:
- At step 0: each side of the square has 1 segment, meaning $2^0 + 1 = 2$ points along each edge. Total points: $2 \times 2 = 4$.
- At step 1: each side divides into 2 segments, meaning $2^1 + 1 = 3$ points along each edge. Total points: $3 \times 3 = 9$.
- At step 2: each side divides into 4 segments, meaning $2^2 + 1 = 5$ points along each edge. Total points: $5 \times 5 = 25$.
In general, after $n$ steps, each side of the big square is divided into $2^n$ segments, containing exactly $2^n + 1$ points along each side.
The total number of points in the $(2^n + 1) \times (2^n + 1)$ grid is:
$$\text{total} = (2^n + 1)^2$$
We can compute $2^n$ using a single bit-shift `1 << n`.

## Optimal approach

1. Compute the number of points along one side:
   `side = (1LL << n) + 1`.
2. Compute the total points by squaring the side count:
   `total = side * side`.
3. Cast to integer and return.

Complexity:
- Time: `O(1)` as it requires a single bit-shift, addition, and multiplication.
- Space: `O(1)` auxiliary space for scalar registers.

## Code walkthrough

In the reference implementation:
- `long long side = (1LL << n) + 1;`: uses 64-bit integer bit-shift to evaluate $2^n + 1$, avoiding 32-bit overflow when $n = 15$ ($2^{15} + 1 = 32,769$).
- `(int)(side * side)`: squares the side length: $(32,769)^2 \approx 1.07 \times 10^9$, which fits inside a 32-bit signed integer.
- Returns the computed product.

## Test it out loud

- `n = 0`:
  - $side = 2^0 + 1 = 2$. Total points: $2 \times 2 = 4$. Returns 4.
- `n = 1`:
  - $side = 2^1 + 1 = 3$. Total points: $3 \times 3 = 9$. Returns 9.
- `n = 3`:
  - $side = 2^3 + 1 = 9$. Total points: $9 \times 9 = 81$. Returns 81.
- `n = 4`:
  - $side = 2^4 + 1 = 17$. Total points: $17 \times 17 = 289$. Returns 289.

## Follow-ups

- What if $n$ can be up to 30?
  For $n = 30$, $2^{30} + 1 \approx 10^9$. Its square is $(10^9)^2 \approx 10^{18}$, which fits inside a 64-bit unsigned/signed `long long`. For $n > 31$, 128-bit integers or big integer multiplication would be required.
- What if the initial shape is a cube in 3D space?
  In 3D, after $n$ steps each dimension has $2^n + 1$ points, so the total points would be $(2^n + 1)^3$.

## Common mistakes

- 32-bit signed integer overflow during squaring: for $n = 15$, $side = 32769$. Squaring in 16-bit or signed contexts without sufficient bit width can cause overflow. Using `1LL` ensures 64-bit arithmetic throughout.
- Miscounting the relationship between segments and points: confusing the number of segments ($2^n$) with the number of points ($2^n + 1$).
- Using floating-point `pow(2, n)` which can introduce precision errors.

## Further reading

- Diamond-square algorithm for procedural terrain generation.
- Geometric subdivision and grid mesh refinement.
