---
id: cses-grid-path-description
pattern: cses-introductory
difficulty: medium
optimal: "O(routes) time and O(1) space with dead-end pruning"
reviewed: false
---

## Clarify first
- What are the start and end coordinates? Start at $(0, 0)$ (top-left) and finish at $(6, 0)$ (bottom-left) on a $7 \times 7$ grid.
- How many cells must be visited? Every one of the 49 cells must be visited exactly once.
- How many steps in total? 48 steps.
- What does the description represent? A 48-character string with characters 'U', 'D', 'L', 'R', or '?' (where '?' allows any valid direction).
- What should be returned? The count of valid Hamiltonian paths that match the description string.

## Examples to say out loud
- Consider description of 48 question marks: `["????...????"]`:
  - Without any fixed moves, the number of distinct Hamiltonian paths from $(0, 0)$ to $(6, 0)$ on a $7 \times 7$ grid is known to be 88,418.
- Consider an immediate dead-end pattern:
  - If the last character (step 48) is 'U' (trying to enter $(6, 0)$ from below), it is impossible because $(6, 0)$ is on the bottom boundary. Count = 0.
- If the first move is 'U' or 'L':
  - Moving Up or Left from $(0, 0)$ immediately exits the grid boundaries. Count = 0.

## Brute force
A naive depth-first search trying all 4 directions at each '?' creates a search tree of up to $4^{48} \approx 6 \times 10^{28}$ nodes, which is astronomical and will never finish.
Even a standard DFS tracking visited cells will take hours without geometric pruning. We must employ dead-end partition pruning: recognizing when a move cuts the remaining unvisited grid into two disconnected components that can no longer both be visited.

## The key observation
Three crucial pruning rules reduce the state space from billions to mere thousands:
1. Early exit: If the path reaches the destination $(6, 0)$ before step 48, it can never visit all 49 cells (since $(6, 0)$ cannot be re-visited). Prune immediately.
2. Wall collision partition: If the path hits a wall or visited cell ahead, while both the left and right cells are unvisited, the path is splitting the remaining board into two isolated unvisited regions. Because the path can only continue into one region, the other region will be marooned and can never be completed. Prune immediately.
3. Transverse wall partition: Similarly, if the cells directly ahead and behind are blocked, but left and right are both free, the board is bisected. Prune immediately.
These geometric pruning checks run in $O(1)$ time and eliminate over $99.99\%$ of futile branches.

## Optimal approach
1. Represent the $7 \times 7$ board with a boolean array `vis[7][7]`.
2. Define a recursive search `go(step, r, c)`:
   - If reached target $(6, 0)$: return 1 if `step == 48`, else return 0 (early exit pruning).
   - If `step == 48`: return 0.
   - Check if current position creates a split:
     - If front and back are blocked, but left and right are free $\implies$ return 0.
     - If left and right are blocked, but front and back are free $\implies$ return 0.
   - Mark `vis[r][c] = true`.
   - For each direction (U, D, L, R):
     - If the description character at `step` is not '?' and does not match the direction, skip.
     - If neighbor $(nr, nc)$ is inside the grid and not visited, add `go(step + 1, nr, nc)` to the count.
   - Unmark `vis[r][c] = false` (backtrack).
   - Return total count.
3. Start search at `go(0, 0, 0)` and return the result.

Complexity:
- Time: Exponential theoretically, but with the bisection pruning, the search visits under $10^6$ nodes and finishes in under 200 ms.
- Space: $O(1)$ auxiliary space beyond the recursion stack of depth 48.

## Code walkthrough
- `if (r == 6 && c == 0) return step == 48 ? 1 : 0`: Checks target cell; rejects premature arrival before all 48 moves are made.
- `if (!freeCell(r - 1, c) && !freeCell(r + 1, c) && freeCell(r, c - 1) && freeCell(r, c + 1)) return 0`: Detects horizontal bisection of free cells.
- `if (!freeCell(r, c - 1) && !freeCell(r, c + 1) && freeCell(r - 1, c) && freeCell(r + 1, c)) return 0`: Detects vertical bisection of free cells.
- `if (d[step] != '?' && d[step] != names[k]) continue`: Skips moves forbidden by the input description pattern.
- `vis[r][c] = true; ... vis[r][c] = false`: Standard backtracking book-keeping.

## Test it out loud
- Test case $1$: 48 question marks $\implies$ Returns 88418 routes.
- Test case $2$: Step 48 fixed to 'U' $\implies$ Cannot enter $(6, 0)$ from $(7, 0)$ (out of bounds) $\implies$ Returns 0.
- Test case $3$: First character 'R' $\implies$ Explores only branches starting with right move to $(0, 1)$, returns 42771.
- Test case $4$: "RRRRRRDDDDDD..." $\implies$ Perimeter path, returns 1770.

## Follow-ups
- How to implement the boundary checks with maximum performance? Embed the $7 \times 7$ grid inside a $9 \times 9$ array with pre-marked visited sentinel boundaries, removing boundary bounds checking inside the inner loop.
- What if diagonal corner dead-ends also occur? Adding 4 corner checks (e.g., top-right diagonal blocked while adjacent edges free) prunes even more aggressively.

## Common mistakes
- Omitting the early-target pruning: Allowing the path to touch $(6, 0)$ before step 48 causes a combinatorial explosion.
- Omitting the wall-splitting check: Without bisection pruning, the runtime exceeds several minutes for inputs with many '?' characters.

## Further reading
- [Hamiltonian Path Problem on Wikipedia](https://en.wikipedia.org/wiki/Hamiltonian_path)
