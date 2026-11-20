---
id: cses-knight-moves-grid
pattern: cses-introductory
difficulty: medium
optimal: "O(n^2) time and O(n^2) space"
reviewed: false
---

## Clarify first
- Where does the knight start? At cell $(0, 0)$ in the top-left corner of an $n \times n$ chessboard.
- What move pattern does a knight have? The standard chess move: 2 squares along one coordinate axis and 1 square along the perpendicular axis (8 possible moves).
- What should each cell $(r, c)$ in the output grid contain? The minimum number of knight moves required to reach $(r, c)$ from $(0, 0)$.
- What are the bounds on $n$? $5 \le n \le 1000$.

## Examples to say out loud
- Consider $n = 5$:
  - $(0, 0)$ starts at 0 moves.
  - From $(0, 0)$, moves reach $(1, 2)$ and $(2, 1)$ in 1 move.
  - From $(1, 2)$ and $(2, 1)$, knight reaches $(0, 2), (0, 4), (2, 0), (2, 4), (3, 1), (3, 3), (4, 0), (4, 2)$ in 2 moves.
  - Moving to immediate neighbor $(0, 1)$ requires 3 moves (e.g. $(0, 0) \to (1, 2) \to (2, 0) \to (0, 1)$ or $(0, 0) \to (2, 1) \to (0, 2) \to (1, 0)$ wait, to $(0, 1)$ is 3 moves).
  - Cell $(1, 1)$ takes 4 moves in the corner because knights cannot move diagonally in one or two steps when constrained by boundaries.
  - Result for row 0: $[0, 3, 2, 3, 2]$.

## Brute force
Attempting to find shortest paths using Depth-First Search (DFS) or running Dijkstra's algorithm would be suboptimal or lead to infinite recursion and time limits. Because every knight step has a uniform edge weight of 1, an unweighted Breadth-First Search (BFS) explores cells in strictly increasing order of distance, guaranteeing the first time a cell is reached is its minimum distance.

## The key observation
The problem is single-source shortest path on an unweighted graph where vertices are the $n^2$ grid cells and directed edges correspond to legal knight moves staying within bounds $0 \le r, c < n$. Standard BFS from $(0, 0)$ with a queue visits each cell once, assigning `dist[next] = dist[curr] + 1` in $O(1)$ amortized operations per cell.

## Optimal approach
1. Allocate an $n \times n$ distance grid `d` initialized to $-1$.
2. Initialize a standard FIFO queue of coordinate pairs `q`.
3. Set `d[0][0] = 0` and push $(0, 0)$ into `q`.
4. Define delta arrays for the 8 knight moves:
   - $dx = [1, 2, 2, 1, -1, -2, -2, -1]$
   - $dy = [2, 1, -1, -2, -2, -1, 1, 2]$
5. While `q` is not empty:
   - Pop front cell $(x, y)$.
   - For each of the 8 moves, calculate neighbor $(nx, ny) = (x + dx[k], y + dy[k])$.
   - If $0 \le nx < n$, $0 \le ny < n$, and $d[nx][ny] == -1$:
     - Set $d[nx][ny] = d[x][y] + 1$.
     - Push $(nx, ny)$ into `q`.
6. Return `d`.

Complexity:
- Time: $O(n^2)$ because each cell is enqueued and dequeued at most once, and each cell has at most 8 neighbors. For $n = 1000$, $10^6$ states finish in $\approx 100$ ms.
- Space: $O(n^2)$ to store the distance grid and the BFS queue.

## Code walkthrough
- `vector<vector<int>> d(n, vector<int>(n, -1))`: Stores shortest path distances; $-1$ serves as the unvisited sentinel.
- `d[0][0] = 0; q.push({0, 0})`: Seeds the BFS from the top-left origin.
- `int dx[8] = {...}, dy[8] = {...}`: Encodes the 8 L-shaped knight vectors.
- `if (nx < 0 || ny < 0 || nx >= n || ny >= n || d[nx][ny] != -1) continue`: Filters out boundary violations and already-discovered cells.
- `d[nx][ny] = d[x][y] + 1`: Assigns the step count immediately upon discovery so the cell is not re-enqueued.

## Test it out loud
- Test case $1$: $n = 5$. Row 0 is $[0, 3, 2, 3, 2]$; row 1 is $[3, 4, 1, 2, 3]$.
- Test case $2$: Cell $(1, 1)$ requires 4 moves for small $n$ due to board corners trapping the knight.
- Test case $3$: Symmetry check: Since knight moves are symmetric across the main diagonal, $d[r][c] == d[c][r]$ always holds.

## Follow-ups
- How to query minimum moves between two arbitrary distant squares on an infinite board? Knight distance follows a closed-form formula based on $\max(\lceil |\Delta x| / 2 \rceil, \lceil |\Delta y| / 2 \rceil, \lceil (|\Delta x| + |\Delta y|) / 3 \rceil)$ with small corner boundary corrections.
- What if the board has blocked obstacles? BFS handles obstacles identically by skipping them during neighbor generation.

## Common mistakes
- Marking cells visited on dequeue instead of enqueue: If a neighbor is not marked visited when discovered, multiple parents will enqueue the same square, causing exponential queue explosion and Memory Limit Exceeded.
- Using DFS: DFS does not explore by shortest path and will blow the call stack on a $1000 \times 1000$ grid.

## Further reading
- [Knight's Graph on Wikipedia](https://en.wikipedia.org/wiki/Knight%27s_graph)
