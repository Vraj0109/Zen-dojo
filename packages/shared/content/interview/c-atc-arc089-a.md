---
id: c-atc-arc089-a
pattern: cses-atcoder
difficulty: medium
optimal: "O(n) time, O(1) extra space"
reviewed: false
---

## Clarify first

- Where and when does the traveller start? (Starts at coordinate $(0, 0)$ at time $t = 0$).
- What movement rules apply? (In every single unit of time, the traveller must move exactly 1 unit in one of the 4 cardinal directions: up, down, left, or right; standing still is strictly prohibited).
- What does each entry in `plan` represent? (A checkpoint $[t_i, x_i, y_i]$ indicating that at timestamp $t_i$, the traveller must be positioned precisely at $(x_i, y_i)$).
- Are timestamps sorted? (Yes, $0 < t_0 < t_1 < \dots \le 10^9$).
- What are the scale constraints? (`1 <= plan.length <= 100000`, and coordinates $0 \le x, y \le 100,000$).
- What should be returned? (A boolean `true` if all checkpoints can be visited at their scheduled times, otherwise `false`).

## Examples to say out loud

- Possible plan: `plan = [[3, 1, 2], [6, 1, 1]]`.
  - From $(0, 0)$ at $t = 0$ to $(1, 2)$ at $t = 3$: $\Delta t = 3$, Manhattan distance $d = |1 - 0| + |2 - 0| = 3$. Distance equals available time ($d = \Delta t$), so valid.
  - From $(1, 2)$ at $t = 3$ to $(1, 1)$ at $t = 6$: $\Delta t = 3$, distance $d = |1 - 1| + |1 - 2| = 1$. $\Delta t \ge d$, and $\Delta t - d = 3 - 1 = 2$ is even (can step away and return). Valid.
  - Result: `true`.
- Distance impossible: `plan = [[2, 100, 100]]`. $\Delta t = 2$, but Manhattan distance is $100 + 100 = 200 > 2$. Result: `false`.
- Parity impossible: `plan = [[1, 0, 0]]`. $\Delta t = 1$, distance is 0. But standing still is disallowed; after 1 step, position must be adjacent to $(0, 0)$. Result: `false`.

## Brute force

A brute-force strategy simulates graph search (Breadth-First Search or Depth-First Search) across all reachable grid points at each timestamp. At each second, a position expands into 4 possible neighbors. Over $10^9$ seconds, the branching factor generates $4^{10^9}$ states, which is completely intractable.

## The key observation

Between any two consecutive checkpoints $(x_{\text{prev}}, y_{\text{prev}})$ at time $t_{\text{prev}}$ and $(x, y)$ at time $t$, let $\Delta t = t - t_{\text{prev}}$ be the available time and $d = |x - x_{\text{prev}}| + |y - y_{\text{prev}}|$ be the minimum Manhattan distance.
A leg is reachable if and only if:
1. Distance constraint: $d \le \Delta t$ (there is enough time to reach the destination).
2. Parity constraint: $(\Delta t - d)$ is even. Because every movement changes the sum of coordinates $(x + y)$ by $\pm 1$, the parity of $(x + y)$ changes on every single step. Any extra time $\Delta t - d$ must be burned by oscillating back and forth (e.g., right then left), which takes an even number of steps.

## Optimal approach

1. Track current state starting at the origin: `t = 0, x = 0, y = 0`.
2. For each checkpoint `p = [target_t, target_x, target_y]` in `plan`:
   a. Compute time elapsed: `dt = target_t - t`.
   b. Compute Manhattan distance: `d = abs(target_x - x) + abs(target_y - y)`.
   c. If `d > dt` or `(dt - d) % 2 != 0`, return `false`.
   d. Update current state: `t = target_t, x = target_x, y = target_y`.
3. If all checkpoints succeed, return `true`.

Complexity:
- Time: `O(n)` where $n$ is the number of checkpoints in `plan`. We process each checkpoint once in $O(1)$ arithmetic operations. For $n = 100,000$, this takes about 5 ms.
- Space: `O(1)` auxiliary space beyond the input list.

## Code walkthrough

In the reference implementation:
- `long long t = 0, x = 0, y = 0;`: tracks the traveller's last confirmed timestamp and coordinates, initialized to $(0, 0)$ at time 0.
- `long long dt = p[0] - t, d = llabs(p[1] - x) + llabs(p[2] - y);`: calculates time delta and Manhattan distance using 64-bit precision to prevent overflow.
- `if (d > dt || (dt - d) % 2 != 0) return false;`: checks both the speed bound and the bipartite grid parity constraint.
- `t = p[0]; x = p[1]; y = p[2];`: advances the reference point to the validated checkpoint.
- `return true;`: confirms the whole journey is feasible.

## Test it out loud

- `plan = [[1, 0, 1]]`:
  - $\Delta t = 1, d = |0| + |1| = 1$. $d \le \Delta t$ and $\Delta t - d = 0$ (even). Returns `true`.
- `plan = [[1, 1, 1]]`:
  - $\Delta t = 1, d = |1| + |1| = 2$. $d > \Delta t$ ($2 > 1$). Returns `false`.
- `plan = [[2, 0, 0]]`:
  - $\Delta t = 2, d = 0$. $d \le \Delta t$ and $2 - 0 = 2$ is even (step right, step left). Returns `true`.
- `plan = [[4, 1, 2]]`:
  - $\Delta t = 4, d = 3$. $4 - 3 = 1$ is odd. Returns `false`.

## Follow-ups

- What if diagonal moves are also allowed (Chebyshev distance)?
  If diagonal moves are permitted, Chebyshev distance $d_\infty = \max(|dx|, |dy|)$ applies. Because standing still is not allowed, parity conditions would depend on whether diagonal moves preserve or flip color in a checkered grid.
- What if obstacles or walls exist on the grid?
  With obstacles, simple Manhattan distance does not guarantee an unblocked path; we would need BFS or an $A^*$ pathfinding algorithm on the explicit grid graph.

## Common mistakes

- Forgetting to enforce the parity check $(\Delta t - d) \bmod 2 == 0$, erroneously allowing a traveller to reach a cell with wrong parity.
- Checking only the overall time and distance from $(0, 0)$ to the final point, rather than validating every consecutive leg $[i-1] \to [i]$.
- Using signed integers where `abs` on boundary values could overflow, or forgetting that times can reach $10^9$.

## Further reading

- Manhattan distance and $L_1$ metric geometry.
- Bipartite graphs and checkerboard parity invariants on grid walks.
