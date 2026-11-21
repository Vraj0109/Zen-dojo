---
id: abc161-a
pattern: cses-atcoder
difficulty: medium
optimal: "O(1) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What are the inputs? Three integers $x, y,$ and $z$, representing the initial contents of box A, box B, and box C respectively.
- What operations are performed in order?
  1. Swap the contents of the first box (A) and the second box (B).
  2. Swap the contents of the first box (A) and the third box (C).
- What should be returned? The final contents of the three boxes as a list/vector $[A_{\text{final}}, B_{\text{final}}, C_{\text{final}}]$.
- What are the constraints? $1 \le x, y, z \le 100$.

## Examples to say out loud
- Consider $x = 1, y = 2, z = 3$.
  - Initial state: Box 1 = 1, Box 2 = 2, Box 3 = 3.
  - After first swap (Box 1 and Box 2): Box 1 = 2, Box 2 = 1, Box 3 = 3.
  - After second swap (Box 1 and Box 3): Box 1 = 3, Box 2 = 1, Box 3 = 2.
  Final state: `[3, 1, 2]`.
- Consider $x = 100, y = 100, z = 100$.
  All values are identical $\to$ returns `[100, 100, 100]`.
- Consider $x = 5, y = 7, z = 9$.
  Output: `[9, 5, 7]`.

## Brute force
A simulation approach executes the two swaps literally:
1. `swap(x, y)`
2. `swap(x, z)`
3. return `[x, y, z]`
Both the simulation and direct algebraic permutation take $O(1)$ time and space.

## The key observation
Let us track the variables through the two operations:
- Initial state: $(A, B, C) = (x, y, z)$.
- Operation 1 swaps $A$ and $B$:
  $(A, B, C) \leftarrow (y, x, z)$.
- Operation 2 swaps $A$ and $C$:
  $(A, B, C) \leftarrow (z, x, y)$.
Notice that the two swaps together perform a right circular shift of the original values:
The value in the first box becomes $z$ (originally third).
The value in the second box becomes $x$ (originally first).
The value in the third box becomes $y$ (originally second).
We can directly return `[z, x, y]` without performing any swaps.

## Optimal approach
1. Return the list/vector `[z, x, y]`.
2. (Or execute `swap(x, y)` followed by `swap(x, z)` and return `{x, y, z}`).
3. Complexity:
   - Time Complexity: $O(1)$, instantaneous assignment.
   - Space Complexity: $O(1)$ auxiliary space beyond returning the 3-element output list.

## Code walkthrough
- `vector<int> abcSwap(int x, int y, int z)`: Function accepting the three box contents.
- `swap(x, y);`: Exchange values of box 1 and box 2 $\to$ values are now $(y, x, z)$.
- `swap(x, z);`: Exchange values of box 1 and box 3 $\to$ values are now $(z, x, y)$.
- `return {x, y, z};`: Return the final 3-element vector.

## Test it out loud
- Test 1: $x = 1, y = 1, z = 1 \to [1, 1, 1]$.
- Test 2: $x = 1, y = 2, z = 3 \to [3, 1, 2]$.
- Test 3: $x = 5, y = 7, z = 9 \to [9, 5, 7]$.
- Test 4: $x = 9, y = 7, z = 5 \to [5, 9, 7]$.
- Test 5: $x = 1, y = 100, z = 50 \to [50, 1, 100]$.

## Follow-ups
- How to represent this as a permutation cycle?
  In cycle notation, the two transpositions are $(1\ 2)$ followed by $(1\ 3)$.
  Composing them: $(1\ 2)(1\ 3) = (1\ 3\ 2)$, meaning $1 \to 3$, $3 \to 2$, and $2 \to 1$.
  The new values at positions $(1, 2, 3)$ are the old values from $(3, 1, 2)$, which matches $(z, x, y)$.
- What if an arbitrary sequence of $m$ swap pairs $(u_i, v_i)$ was applied to $n$ boxes?
  Initialize an array `arr = [0, 1, ..., n-1]`, apply each swap `swap(arr[u], arr[v])`, and then construct the final array in $O(n + m)$ time.

## Common mistakes
- Performing the swaps in the wrong order (e.g. swapping 1 and 3 first, then 1 and 2), which produces $(y, z, x)$ instead of $(z, x, y)$.
- Swapping the wrong pairs (e.g. swapping 2 and 3 in the second step).
