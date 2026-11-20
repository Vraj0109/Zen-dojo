---
id: cses-building-teams
pattern: cses-graph-algorithms
difficulty: medium
optimal: "O(n + m) time and O(n + m) space"
reviewed: false
---

## Clarify first
- What are the inputs? An integer $n$ (pupils numbered 1 to $n$) and a list of $m$ friendships between pairs of pupils.
- What is the condition for a valid division? Pupils must be divided into two teams (team 1 and team 2) such that no two friends belong to the same team.
- What should be returned? `true` if such a 2-team assignment is possible, or `false` if impossible.
- What are the constraints? $1 \le n \le 100000$ and $0 \le m \le 200000$.

## Examples to say out loud
- Consider $n = 5$ and `friendships = [[1, 2], [1, 3], [4, 5]]`:
  - Pupils $\{1, 2, 3\}$: Assign pupil 1 to Team 1 $\implies$ pupils 2 and 3 must be on Team 2. Since there is no friendship between 2 and 3, this is valid.
  - Pupils $\{4, 5\}$: Assign pupil 4 to Team 1 $\implies$ pupil 5 to Team 2.
  - Valid division exists. Return `true`.
- Consider $n = 3$ and `friendships = [[1, 2], [2, 3], [3, 1]]`:
  - Friendships form a triangle (an odd cycle of length 3).
  - Pupil 1 on Team 1 $\implies$ 2 on Team 2 $\implies$ 3 on Team 1. But 3 and 1 are friends on Team 1!
  - Impossible. Return `false`.

## Brute force
A brute-force solution would check all $2^n$ possible team assignments and verify if any assignment has no internal friendships. With $n = 100000$, $2^{100000}$ is impossible. Checking if a graph can be partitioned into two independent sets is the classic **Graph 2-Coloring (Bipartiteness)** problem, which BFS or DFS solves in $O(n + m)$ linear time.

## The key observation
The problem is equivalent to determining whether the friendship graph is **bipartite** (2-colorable).
A graph is bipartite if and only if it contains **no odd-length cycles**.
We can traverse each connected component using Breadth-First Search:
- Assign the start pupil of an uncolored component to Team 1 (`color = 1`).
- For every pupil $u$ on team $c$, all their friends $v$ must be assigned to the opposing team $3 - c$ (`color = 2` if $c=1$, and `color = 1` if $c=2$).
- If we ever inspect an edge $(u, v)$ where friend $v$ is already colored with the *same* color as $u$ (`color[v] == color[u]`), an odd cycle is detected, and we immediately return `false`.
If all connected components are 2-colored without conflicts, return `true`.

## Optimal approach
1. Build an adjacency list `adj` of size $n + 1$ representing the friendship graph.
2. Allocate an array `color` of size $n + 1$ initialized to 0 (where 0 indicates uncolored, 1 is Team 1, 2 is Team 2).
3. For each pupil $i$ from 1 to $n$:
   - If `color[i] != 0`, continue (already processed in an earlier component).
   - Set `color[i] = 1`.
   - Initialize a BFS queue and enqueue $i$.
   - While the queue is not empty:
     - Pop pupil $u$.
     - For each neighbor $v$ in `adj[u]`:
       - If `color[v] == 0`:
         - Set `color[v] = 3 - color[u]`.
         - Enqueue $v$.
       - Else if `color[v] == color[u]`:
         - Conflict detected! Return `false`.
4. If all components are successfully colored without conflicts, return `true`.

Complexity:
- Time: $O(n + m)$ because each pupil and each friendship edge is visited at most twice during BFS.
- Space: $O(n + m)$ to store the adjacency list, color array, and BFS queue.

## Code walkthrough
- `vector<int> color(n + 1, 0)`: Tracks team assignment (1 or 2); 0 indicates unassigned.
- `for (int i = 1; i <= n; i++)`: Iterates over all vertices to handle disconnected graph components.
- `color[v] = 3 - color[u]`: Toggles the color between 1 and 2 ($3 - 1 = 2$, and $3 - 2 = 1$).
- `else if (color[v] == color[u]) return false`: Detects an odd cycle and terminates immediately.
- `return true`: Valid bipartition confirmed.

## Test it out loud
- Test case $1$: $n = 1$, no friendships $\implies$ 1 pupil on Team 1, returns `true`.
- Test case $2$: $n = 4$, cycle of 4: $1-2-3-4-1$ (even cycle) $\implies$ alternating colors $1, 2, 1, 2$ valid, returns `true`.
- Test case $3$: $n = 5$, cycle of 5: $1-2-3-4-5-1$ (odd cycle) $\implies$ returns `false`.
- Test case $4$: Disconnected graph with an odd cycle in one component $\implies$ returns `false`.

## Follow-ups
- How to return the actual team assignments? If `true`, return the `color` array (excluding index 0). If `false`, return "IMPOSSIBLE".
- What if 3 teams were allowed? 3-coloring is NP-complete, requiring exponential backtracking.

## Common mistakes
- Only running BFS from node 1: If the graph is disconnected (multiple components), running BFS only from node 1 leaves other components uncolored and misses odd cycles in separate components.
- Deep recursion stack overflow: Using recursive DFS instead of iterative BFS can blow the call stack on large path graphs of length $100000$.

## Further reading
- [Bipartite Graph on Wikipedia](https://en.wikipedia.org/wiki/Bipartite_graph)
