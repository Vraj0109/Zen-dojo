---
id: cses-monsters
pattern: CSES: graph algorithms
difficulty: medium
optimal: "O(n * m) time, O(n * m) space"
reviewed: false
---

## Clarify first
- What moves are allowed? Four orthogonal directions (up, down, left, right) onto floor cells ('.'). Neither player nor monsters can walk into walls ('#').
- Who moves when? The player and all monsters take one step simultaneously per time unit.
- What constitutes an escape? Reaching any cell on the outer boundary of the grid: row 0, row n - 1, column 0, or column m - 1.
- Under what condition can a cell be safely entered? The player must reach the cell strictly before any monster can reach it. If a monster arrives at time t and the player arrives at time t, the monster intercepts the player.
- What if the player already starts on the boundary? If cell 'A' is on the perimeter at step 0, escape takes 0 steps.

## Examples to say out loud
Suppose we have a 5 by 8 grid with walls, player 'A' inside, and monsters 'M' in various corridors.
If monster M1 can reach cell (3, 7) at time 6, and player A has a path to (3, 7) that arrives at time 5, player A reaches the boundary safely in 5 steps.
Conversely, if every available path towards any exit has a monster arriving at equal or earlier time, player A cannot escape and we return -1.
If player 'A' is enclosed on all sides by walls '#' like `["###", "#A#", "###"]`, no boundary cells are reachable, returning -1.

## Brute force
We could simulate game turns turn-by-turn with simultaneous entity movements. However, monsters have multiple potential branches and paths, causing an exponential explosion of states.
Since monsters move independently to intercept in minimal time, we do not need to simulate turn-by-turn interactions. Every monster simply follows its shortest path to any given cell.

## The key observation
Monsters move concurrently and optimally. Therefore, the earliest time any monster can reach a cell (r, c) is simply the shortest grid distance from the nearest monster to (r, c).
This earliest monster arrival time across the entire grid can be computed in a single pass using a multi-source Breadth-First Search (BFS) seeded with all monster positions at time 0.
Once all monster arrival times are known, the problem reduces to a second BFS for the player: the player can step into neighbor (nr, nc) at time t + 1 if and only if t + 1 is strictly less than the monster arrival time at (nr, nc). The first time the player reaches any boundary cell, that step count is the guaranteed minimum.

## Optimal approach
1. Parse the grid to find player coordinates 'A' and all monster coordinates 'M'.
2. Initialize an array `mdist` of size n * m with infinity. For each monster cell, set `mdist` to 0 and push its index into a multi-source queue.
3. Run BFS from all monsters: pop each cell, examine valid non-wall 4-directional neighbors, relax `mdist[neighbor] = mdist[current] + 1`, and enqueue.
4. Check if player 'A' starts directly on any boundary edge (row 0, row n - 1, column 0, or column m - 1). If so, return 0 immediately.
5. Initialize an array `pdist` of size n * m with -1. Set `pdist[start]` = 0 and enqueue the player.
6. Run player BFS: pop current cell, explore adjacent non-wall cells. A neighbor is valid if `pdist[neighbor] == -1` and `pdist[current] + 1 < mdist[neighbor]`.
7. If this neighbor is on any boundary edge, immediately return `pdist[current] + 1`. Otherwise, record distance and push to queue.
8. If the player queue empties without reaching an exit, return -1.

Complexity: O(n * m) time because each grid cell is visited at most once per BFS pass, and O(n * m) space for distance arrays and queues.

## Code walkthrough
In step 1, we flatten 2D coordinates `(i, j)` to `i * m + j` to allow compact 1D vectors for `mdist` and `pdist`.
In the monster BFS loop, we use standard direction arrays `dr = {-1, 1, 0, 0}` and `dc = {0, 0, -1, 1}`. When relaxing neighbor `v`, we check `mdist[v] > mdist[u] + 1`.
Before starting the player BFS, an early exit check `ar == 0 || ar == n - 1 || ac == 0 || ac == m - 1` covers the zero-step boundary case.
In player BFS, when exploring neighbor `v`, the critical check is `pdist[u] + 1 < mdist[v]`. If satisfied, we check boundary coordinates right away: if `nr == 0 || nr == n - 1 || nc == 0 || nc == m - 1`, return `pdist[v]`.

## Test it out loud
- Player at boundary: `["A.", ".."]`. Player is at (0, 0), which is on the boundary. Immediate check returns 0.
- Single cell grid: `["A"]`. Immediate check returns 0.
- Monster reaches exit first: `["#####", "#A.M.", "#####"]`. Player takes 1 step to (1, 2) at time 1. Monster reaches (1, 2) at time 1. Condition `pdist < mdist` fails, player is blocked, returns -1.
- Player reaches exit first: `["#####", "#M.A.", "#####"]`. Player reaches exit at (1, 4) in 1 step; monster needs 3 steps. Returns 1.

## Follow-ups
- How would you reconstruct the path and direction string ("U", "D", "L", "R")? Maintain a parent pointer and direction array in the player BFS, then trace back from the exit cell to 'A'.
- What if some monsters move slower (e.g., 1 step every 2 turns)? We could adjust the edge weights in the monster search using 0-1 BFS or Dijkstra.
- What if walls can be destroyed at a cost? This transforms into a weighted graph shortest path solved with Dijkstra instead of standard BFS.

## Common mistakes
- Allowing player arrival when `pdist[v] == mdist[v]`: monsters catch the player if both reach the cell simultaneously, so strict inequality `pdist[v] < mdist[v]` is mandatory.
- Forgetting to check if player already starts on the border: without an upfront boundary check, the BFS might search for outgoing moves even when 0 steps suffice.
- Running separate BFS runs for each monster individually: with multiple monsters, running BFS per monster costs O(K * n * m), whereas a multi-source BFS handles all monsters in a single O(n * m) sweep.

## Further reading
- Multi-source Breadth-First Search patterns
- Grid pathfinding and level-set propagation
- Flood fill algorithms on 2D matrices
