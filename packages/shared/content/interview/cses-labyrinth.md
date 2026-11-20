---
id: cses-labyrinth
pattern: cses-graph-algorithms
difficulty: medium
optimal: "O(n \times m) time and O(n \times m) space"
reviewed: false
---

## Clarify first
- What are the dimensions and cell types? An $n \times m$ grid containing floor cells ('.'), wall cells ('#'), start cell ('A'), and destination cell ('B').
- What moves are permitted? Orthogonal moves (up, down, left, right) to non-wall cells.
- What should be returned? The minimum number of steps to travel from 'A' to 'B'. If 'B' is unreachable from 'A', return -1.
- Are there guaranteed to be exactly one 'A' and one 'B'? Yes, constraints guarantee exactly one 'A' and one 'B'.
- What are the grid dimensions? $1 \le n, m \le 1000$.

## Examples to say out loud
- Consider a simple labyrinth:
  ```
  A # B
  . # .
  . . .
  ```
  - Direct path between A and B is blocked by wall at $(0, 1)$.
  - We can route down around the wall: $(0, 0) \to (1, 0) \to (2, 0) \to (2, 1) \to (2, 2) \to (1, 2) \to (0, 2)$.
  - Total steps = 6.
- Consider `[["A#B", "###", "..."]]`:
  - Destination 'B' is completely surrounded by walls.
  - Return -1.
- Immediate neighbors `[["AB"]]`:
  - 1 step.

## Brute force
A brute-force search would use depth-first search (DFS) to explore all simple paths. Because mazes can contain exponential paths, DFS will get trapped in cycles or long winding corridors and result in Time Limit Exceeded. Because every movement step has uniform cost 1, Breadth-First Search (BFS) explores vertices in strictly non-decreasing order of distance, guaranteeing that the first time 'B' is reached is its minimum step count.

## The key observation
This is single-source shortest path on an unweighted grid graph of up to $10^6$ vertices.
Standard BFS using a queue:
- Seeds with start cell 'A' at distance 0.
- Advances layer by layer across the 4 cardinal directions.
- Maintains a distance array initialized to -1 (serving as both distance recorder and visited tracker).
- Terminates immediately and returns the distance the moment destination 'B' is dequeued.
- If the queue empties without reaching 'B', returns -1.
Flattening 2D coordinates $(r, c)$ into a 1D index $r \times m + c$ optimizes cache performance and memory overhead.

## Optimal approach
1. Scan the grid to locate the coordinates of 'A' (`sr, sc`) and 'B' (`tr, tc`).
2. Allocate a 1D array `dist` of size $n \times m$ initialized to -1.
3. Initialize a queue of integer indices.
4. Set $\text{dist}[sr \times m + sc] = 0$ and push $sr \times m + sc$ into the queue.
5. While the queue is not empty:
   - Pop front element $u$, unpack $r = u / m$ and $c = u \pmod m$.
   - If $r == tr$ and $c == tc$, return $\text{dist}[u]$.
   - For each of the 4 directions $(nr, nc) \in \{(r-1, c), (r+1, c), (r, c-1), (r, c+1)\}$:
     - If $0 \le nr < n$, $0 \le nc < m$, `grid[nr][nc] != '#'`, and $\text{dist}[nr \times m + nc] == -1$:
       - Set $\text{dist}[nr \times m + nc] = \text{dist}[u] + 1$.
       - Enqueue $nr \times m + nc$.
6. Return -1.

Complexity:
- Time: $O(n \times m)$ because each of the $n \times m$ cells is enqueued and dequeued at most once, performing 4 edge checks.
- Space: $O(n \times m)$ to store the distance array and BFS queue.

## Code walkthrough
- `int sr = -1, sc = -1, tr = -1, tc = -1`: Locates positions of 'A' and 'B'.
- `vector<int> dist(n * m, -1)`: Unified distance and visited tracker; $-1$ indicates unvisited.
- `int u = q[head++]; int r = u / m, c = u % m`: Dequeues cell and unpacks row/column.
- `if (r == tr && c == tc) return dist[u]`: Early exit returning the shortest distance upon reaching 'B'.
- `dist[v] = dist[u] + 1; q.push_back(v)`: Updates neighbor distance and marks visited immediately upon discovery.

## Test it out loud
- Test case $1$: `[["AB"]]`. Distance from A to B is 1 $\implies$ returns 1.
- Test case $2$: `[["A", ".", "B"]]`. Vertical line of length 2 $\implies$ returns 2.
- Test case $3$: `[["A#B", ".#.", "..."]]`. Path routes around the central vertical wall $\implies$ returns 6.
- Test case $4$: 'B' walled in on all 4 sides $\implies$ queue exhausts, returns -1.

## Follow-ups
- How to reconstruct the exact path string of directions ("UDLR")? Maintain a `parent[v]` or `prev_move[v]` array storing the direction taken to reach cell $v$. When reaching 'B', backtrack from 'B' to 'A' and reverse the constructed string.
- What if edge costs varied (e.g. mud cells taking cost 2)? Use 0-1 BFS with a deque, or Dijkstra's algorithm with a priority queue.

## Common mistakes
- Marking cells visited upon dequeue: Fails to prevent duplicate enqueues from multiple adjacent neighbors, causing memory blowup and TLE. Always mark visited immediately upon enqueue.
- Using recursive DFS: DFS does not find the shortest path and blows the call stack on large $1000 \times 1000$ open maps.

## Further reading
- [Breadth-First Search on Wikipedia](https://en.wikipedia.org/wiki/Breadth-first_search)
