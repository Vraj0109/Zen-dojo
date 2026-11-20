---
id: cses-message-route
pattern: cses-graph-algorithms
difficulty: medium
optimal: "O(n + m) time and O(n + m) space"
reviewed: false
---

## Clarify first
- What are the inputs? An integer $n$ (computers numbered 1 to $n$) and a list of $m$ bidirectional network connections.
- What is the objective? Find the minimum number of computers on a valid route from computer 1 to computer $n$ (inclusive of both 1 and $n$).
- What should be returned if computer $n$ is unreachable from computer 1? Return -1.
- Are connections weighted? No, all connections have uniform hop length 1.
- What are the constraints? $2 \le n \le 100000$ and $1 \le m \le 200000$.

## Examples to say out loud
- Consider $n = 5$ and `connections = [[1, 2], [1, 3], [1, 4], [2, 3], [5, 4]]`:
  - From computer 1, we can reach 2, 3, 4 in 1 hop.
  - From computer 4, we can reach computer 5 in 1 hop.
  - Shortest path: $1 \to 4 \to 5$.
  - The number of computers on this route is $1, 4, 5$, which is 3 computers (distance $2$ hops $+ 1$).
  - Return 3.
- Consider $n = 5$ and `connections = [[1, 2], [3, 4], [4, 5]]`:
  - Computer 1 is disconnected from $\{3, 4, 5\}$.
  - Return -1.
- Direct connection: $n = 2$, `connections = [[1, 2]]` $\implies 2$ computers.

## Brute force
A brute-force search using Depth-First Search (DFS) would explore all possible simple paths from 1 to $n$. Because the network can contain many cycles and redundant paths, DFS would explore exponentially many paths ($O(2^n)$ in dense subgraphs) and fail to find the shortest route efficiently. Breadth-First Search (BFS) is guaranteed to discover the shortest hop distance in $O(n + m)$ time.

## The key observation
Since every edge represents an unweighted hop between two computers, the shortest route from computer 1 to computer $n$ corresponds directly to the shortest path in an unweighted graph.
Running BFS starting from node 1:
- Nodes are visited in strictly increasing order of their hop distance from 1.
- The first time computer $n$ is dequeued or discovered, its recorded distance $d$ is guaranteed to be minimal.
- Because the route is inclusive of both the starting computer and destination computer, a path of $d$ hops contains exactly **$d + 1$ computers**.

## Optimal approach
1. Build an adjacency list `adj` of size $n + 1$ representing the bidirectional graph.
2. Allocate a `dist` array of size $n + 1$ initialized to -1.
3. Initialize a queue, set `dist[1] = 0`, and push 1.
4. While the queue is not empty:
   - Pop front computer $u$.
   - If $u == n$, return `dist[u] + 1`.
   - For each neighbor $v$ in `adj[u]`:
     - If `dist[v] == -1`:
       - Set `dist[v] = dist[u] + 1`.
       - Push $v$ into the queue.
5. If the queue empties without reaching $n$, return -1.

Complexity:
- Time: $O(n + m)$ because BFS traverses each vertex and each bidirectional edge at most twice.
- Space: $O(n + m)$ to store the adjacency list, distance array, and queue.

## Code walkthrough
- `vector<vector<int>> adj(n + 1)`: Adjacency list storing neighbors for 1-based computer numbers.
- `vector<int> dist(n + 1, -1)`: Stores shortest distance from computer 1; $-1$ indicates an unvisited computer.
- `dist[1] = 0; q.push_back(1)`: Seeds the search from computer 1.
- `if (u == n) return dist[u] + 1`: When node $n$ is reached, returns the computer count (hops $+ 1$).
- `if (dist[v] == -1) { dist[v] = dist[u] + 1; q.push_back(v); }`: Enqueues newly discovered computers and marks their distance immediately.

## Test it out loud
- Test case $1$: $n = 2$, `connections = [[1, 2]]`. 1 hop $\implies 1 + 1 = 2$ computers.
- Test case $2$: $n = 3$, `connections = [[1, 2], [2, 3]]`. $1 \to 2 \to 3 \implies 3$ computers.
- Test case $3$: $n = 4$, `connections = [[1, 2], [2, 3]]` (node 4 isolated) $\implies$ returns -1.
- Test case $4$: Multiple paths of different lengths (e.g. length 2 vs length 5) $\implies$ BFS naturally finds length 2 first.

## Follow-ups
- How to reconstruct and return the full path sequence of computer IDs? Maintain an array `parent` of size $n + 1$. When setting `dist[v] = dist[u] + 1`, set `parent[v] = u`. Once $n$ is reached, backtrack from $n$ to 1 using `parent` and reverse the sequence.
- What if connections had non-uniform latencies (weights)? Use Dijkstra's algorithm with a min-priority queue instead of standard BFS.

## Common mistakes
- Returning `dist[n]` instead of `dist[n] + 1`: The problem asks for the *number of computers* on the route, which is the number of edges plus 1.
- Sizing arrays to $n$ instead of $n + 1$: Computers are 1-indexed from 1 to $n$; indexing `adj[n]` on an array of size $n$ causes an out-of-bounds error.

## Further reading
- [Breadth-First Search on Wikipedia](https://en.wikipedia.org/wiki/Breadth-first_search)
