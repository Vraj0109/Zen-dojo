---
id: c-cf-69a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) space"
reviewed: false
---

## Clarify first
- What does it mean for a body to be in equilibrium? A body is in equilibrium if and only if the vector sum of all applied forces is the zero vector $(0, 0, 0)$.
- What are the components of each force? Each force is represented as an array of 3 integers: $[x, y, z]$.
- How many force vectors are given? $n$ vectors, where $1 \le n \le 100$.
- What is the range of each coordinate? Each coordinate is an integer between $-100$ and $100$.
- Can the total sum along an axis overflow standard integer types? With at most 100 forces and coordinates bounded by $\pm 100$, the sum on any axis is at most $\pm 10000$, well within standard 32-bit integer limits.

## Examples to say out loud
- Consider `forces = [[3, -1, 7], [-5, 2, -4], [2, -1, -3]]`.
  - Sum along x: $3 + (-5) + 2 = 0$.
  - Sum along y: $-1 + 2 + (-1) = 0$.
  - Sum along z: $7 + (-4) + (-3) = 0$.
  All three component sums are zero $\to$ return `true`.
- Consider `forces = [[4, 1, 7], [-2, 4, -1], [1, -5, -3]]`.
  - Sum along x: $4 + (-2) + 1 = 3 \ne 0$.
  Because the x-component does not cancel out $\to$ return `false`.

## Brute force
Because vector addition in 3D Euclidean space requires summing each component independently across all $n$ vectors, there is no simpler brute force. Computing the component sums directly takes $O(n)$ time and $O(1)$ memory. An incorrect naive approach might sum the scalar magnitudes or sum all components into a single number, but that violates vector equilibrium.

## The key observation
Vector equilibrium in three dimensions requires three separate simultaneous equations to hold:
$\sum_{i=1}^n x_i = 0$,
$\sum_{i=1}^n y_i = 0$,
$\sum_{i=1}^n z_i = 0$.
We maintain three integer accumulators (one per coordinate axis), iterate over all forces once, and verify that all three accumulators equal 0 at the end.

## Optimal approach
1. Initialize three accumulators: `sum_x = 0`, `sum_y = 0`, and `sum_z = 0`.
2. Iterate through each 3D vector $f$ in the list `forces`:
   - Add $f[0]$ to `sum_x`.
   - Add $f[1]$ to `sum_y`.
   - Add $f[2]$ to `sum_z`.
3. Check whether `sum_x == 0 && sum_y == 0 && sum_z == 0`.
4. Return `true` if all are zero, otherwise return `false`.
5. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the number of force vectors. Each force vector is examined once.
   - Space Complexity: $O(1)$, requiring only three integer variables.

## Code walkthrough
- `int x = 0, y = 0, z = 0;`: Initialize separate accumulators for the three spatial axes.
- `for (auto& f : forces)`: Loop through each 3-element force vector.
- `x += f[0]; y += f[1]; z += f[2];`: Add each component to its respective coordinate total.
- `return x == 0 && y == 0 && z == 0;`: Return true if all component sums independently vanish.

## Test it out loud
- Test 1: `forces = [[0, 0, 0]]` $\to x=0, y=0, z=0 \to$ `true`.
- Test 2: `forces = [[1, 0, 0]]` $\to x=1 \ne 0 \to$ `false`.
- Test 3: `forces = [[1, 2, 3], [-1, -2, -3]]` $\to x=0, y=0, z=0 \to$ `true`.
- Test 4: `forces = [[1, 2, 3], [-1, -2, -2]]` $\to z = 3 - 2 = 1 \ne 0 \to$ `false`.

## Follow-ups
- What if forces are in $d$-dimensional space rather than 3D?
  Use an array of size $d$ to accumulate component sums. The time complexity becomes $O(n \cdot d)$ and space complexity $O(d)$.
- What if coordinates are floating-point values instead of integers?
  Direct comparison with zero can fail due to rounding errors; we would check whether $|\sum x_i| < \epsilon$ for an acceptable tolerance $\epsilon \approx 10^{-9}$.

## Common mistakes
- Adding all numbers across all dimensions into a single variable (`x + y + z == 0`). Components along different axes cannot cancel each other out in vector addition.
- Checking equilibrium after each force rather than after summing all forces together.
- Forgetting to check the z-axis (e.g. only testing $x$ and $y$).
