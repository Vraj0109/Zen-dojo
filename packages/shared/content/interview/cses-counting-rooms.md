---
id: cses-counting-rooms
pattern: cses-graph-algorithms
difficulty: medium
optimal: "O(n \times m) time and O(n \times m) space"
reviewed: false
---

## Clarify first
- What does the grid represent? An $n \times m$ grid of characters where '.' represents an empty floor cell and '#' represents a wall.
- How is a room defined? A room is a maximal connected component of floor cells ('.') connected horizontally or vertically.
- What should be returned? The total number of distinct rooms in the building.
- Can we move diagonally? No, movements are only orthogonal (4 directions: up, down, left, right).
- What are the dimensions? $1 \le n, m \le 1000$.

## Examples to say out loud
- Consider a small grid:
  ```
  ########
  #..#...#
  ####.#.#
  #..#...#
  ########
  ```
  - Top-left has a $1 \times 2$ room.
  - Bottom-left has a $1 \times 2$ room.
  - Right side has an irregular connected room of size 8.
  - Total rooms = 3.
- Edge case: all walls:
  - `[["###", "###", "###"]]` $\implies 0$ rooms.
- Single cell:
  - `[["."]]` $\implies 1$ room.

## Brute force
This is the standard connected components problem on an unweighted grid graph. A brute force algorithm might run all-pairs reachability or Floyd-Warshall, which takes $O((n \cdot m)^3)$ time and would fail catastrophically on a $1000 \times 1000$ grid ($10^6$ nodes). Standard graph traversal (Breadth-First Search or iterative Depth-First Search) visits each cell once in optimal $O(n \cdot m)$ time.

## The key observation
The grid naturally models an undirected graph where each '.' cell is a vertex and edges connect adjacent '.' cells.
The problem is equivalent to counting the number of connected components in this graph.
We can scan through the grid cell by cell:
Whenever we encounter an unvisited '.' cell, we increment our room count and launch a traversal (BFS) to mark all floor cells reachable within that component as visited (e.g., flipping '.' to '#').
Using iterative BFS with a queue avoids deep recursive call stacks, preventing stack overflow on $1000 \times 1000$ grids.

## Optimal approach
1. If the grid is empty, return 0.
2. Initialize `rooms = 0`.
3. For each cell $(i, j)$ from $(0, 0)$ to $(n - 1, m - 1)$:
   - If `grid[i][j] == '.'`:
     - Increment `rooms`.
     - Mark `grid[i][j] = '#'` (visited).
     - Initialize a queue and push $(i, j)$.
     - While the queue is not empty:
       - Pop front cell $(r, c)$.
       - For each of the 4 cardinal neighbors $(nr, nc)$:
         - If $(nr, nc)$ is within bounds and `grid[nr][nc] == '.'`:
           - Mark `grid[nr][nc] = '#'` immediately.
           - Push $(nr, nc)$ into the queue.
4. Return `rooms`.

Complexity:
- Time: $O(n \times m)$ because every cell in the $n \times m$ grid is visited and checked a constant number of times (at most 4 edge checks per cell).
- Space: $O(n \times m)$ in the worst case for the BFS queue (e.g., a snake-like floor filling the grid).

## Code walkthrough
- `int dr[4] = {-1, 1, 0, 0}, dc[4] = {0, 0, -1, 1}`: Direction offsets for orthogonal moves.
- `if (grid[i][j] == '.')`: Detects an unvisited floor component.
- `rooms++`: Increments component counter.
- `grid[nr][nc] = '#'`: In-place marking immediately upon enqueue ensures no cell is added to the queue more than once.
- `q.push_back({nr, nc})`: Standard FIFO queue expansion.

## Test it out loud
- Test case $1$: `[["###", "###", "###"]]`. No floor cells $\implies$ returns 0.
- Test case $2$: `[[".", "."]]`. Two adjacent floor cells form 1 room $\implies$ returns 1.
- Test case $3$: `[[".#.", "#.#", ".#."]]`. Center and 4 corners separated by walls $\implies$ returns 5.
- Test case $4$: $1000 \times 1000$ open floor grid: Entire grid traversed in 1 BFS pass $\implies$ returns 1.

## Follow-ups
- Why is recursive DFS discouraged here? On a $1000 \times 1000$ grid with an open floor, the recursion depth can reach $10^6$. Default call stacks (typically 8 MB) crash with a stack overflow around depth $10^4 - 10^5$. Iterative BFS or an explicit heap-allocated stack is memory-safe.
- Can Disjoint Set Union (DSU) be used? Yes, initialize a DSU with $n \times m$ elements, union adjacent '.' cells, and count unique component representatives. BFS is generally faster and uses less memory.

## Common mistakes
- Marking cells visited on dequeue instead of enqueue: If a cell is only marked visited when popped, adjacent neighbors will push the same cell into the queue multiple times, causing exponential memory growth and Time Limit Exceeded.
- Deep recursion stack overflow: Using standard recursive DFS in languages without tail-call optimization or large call stacks crashes on large mazes.

## Further reading
- [Connected Component in Graph Theory on Wikipedia](https://en.wikipedia.org/wiki/Component_(graph_theory))
