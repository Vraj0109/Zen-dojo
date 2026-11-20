---
id: cses-building-roads
pattern: cses-graph-algorithms
difficulty: medium
optimal: "O(n + m \cdot \alpha(n)) time and O(n) space"
reviewed: false
---

## Clarify first
- What are the inputs? An integer $n$ (cities numbered 1 to $n$) and a list of $m$ bidirectional roads connecting pairs of cities.
- What is the objective? Find the minimum number of new roads needed so that every city can reach every other city (i.e. the entire graph becomes connected).
- What should be returned? The integer count of new roads required.
- What are the constraints? $1 \le n \le 100000$ and $0 \le m \le 200000$.

## Examples to say out loud
- Consider $n = 4$ and `roads = [[1, 2], [3, 4]]`:
  - Cities $\{1, 2\}$ form Component 1.
  - Cities $\{3, 4\}$ form Component 2.
  - There are $C = 2$ connected components.
  - Building 1 road (e.g. between city 2 and city 3) connects the entire kingdom.
  - Output: $2 - 1 = 1$.
- Consider $n = 5$ and `roads = [[1, 2], [2, 3], [3, 4], [4, 5]]`:
  - All 5 cities are already in 1 connected component ($C = 1$).
  - New roads needed = $1 - 1 = 0$.
- Edge case: $n = 4$ and `roads = []`:
  - 4 isolated cities ($C = 4$). Minimum roads needed = $4 - 1 = 3$.

## Brute force
This problem asks for the minimum edges to connect an undirected graph. Calculating all-pairs shortest paths or checking every possible pair of cities would take $O(n^2)$ time. Standard graph connectivity algorithms (Disjoint Set Union or BFS/DFS) identify all connected components in nearly linear time.

## The key observation
If an undirected graph with $n$ vertices consists of $C$ disjoint connected components, then:
- Each component is internally connected.
- To connect all components together into a single connected spanning tree of components, we need to add edges between different components.
By Cayley's theorem and basic tree properties, a graph of $C$ components requires at least **$C - 1$ new edges** to become connected.
Adding any fewer than $C - 1$ edges leaves at least two disconnected components.
Therefore, the problem reduces strictly to counting the number of connected components $C$ and returning $C - 1$.

## Optimal approach
1. Initialize a Disjoint Set Union (DSU) structure for $n$ elements, setting the initial component count `comps = n`.
2. For each road $[u, v]$ in `roads`:
   - Union $u$ and $v$. If their roots differ, merge them and decrement `comps` by 1.
3. Return `comps - 1`.

Complexity:
- Time: $O(n + m \cdot \alpha(n))$ where $\alpha$ is the Inverse Ackermann function (effectively $\le 4$ for all practical input sizes). For $n = 100000, m = 200000$, finishes in under 15 ms.
- Space: $O(n)$ to store the parent pointers in the DSU.

## Code walkthrough
- `struct DSU`: Implements standard path compression.
- `comps = n`: Starts with $n$ independent components.
- `int rootI = find(i); int rootJ = find(j)`: Locates canonical root representatives.
- `if (rootI != rootJ) { parent[rootI] = rootJ; comps--; }`: Merges distinct components and decrements the component counter.
- `return dsu.comps - 1`: The minimum number of roads to connect $C$ components into 1 is $C - 1$.

## Test it out loud
- Test case $1$: $n = 1$, `roads = []`. $C = 1 \implies 1 - 1 = 0$ roads.
- Test case $2$: $n = 4$, `roads = []`. $C = 4 \implies 4 - 1 = 3$ roads.
- Test case $3$: $n = 6$, `roads = [[1, 2], [2, 3], [4, 5]]`. Components: $\{1, 2, 3\}$, $\{4, 5\}$, $\{6\}$. $C = 3 \implies 3 - 1 = 2$ roads.
- Test case $4$: Complete ring graph $\implies C = 1 \implies 0$ roads.

## Follow-ups
- How would we output the actual pairs of cities where roads should be built? Collect one representative city from each connected component (e.g. `roots[k]`). Then print roads connecting `roots[0]` to `roots[1]`, `roots[1]` to `roots[2]`, ..., `roots[C-2]` to `roots[C-1]`.
- Can this be done with BFS/DFS instead of DSU? Yes, iterate $i$ from 1 to $n$; whenever vertex $i$ is unvisited, increment $C$ and run a BFS/DFS to visit all nodes in its component. The time complexity is $O(n + m)$.

## Common mistakes
- Off-by-one error: Returning $C$ instead of $C - 1$.
- 0-based vs 1-based indexing in DSU: Cities are numbered 1 to $n$. Sizing the parent array to $n + 1$ prevents out-of-bounds array access.

## Further reading
- [Disjoint-Set Data Structure on Wikipedia](https://en.wikipedia.org/wiki/Disjoint-set_data_structure)
