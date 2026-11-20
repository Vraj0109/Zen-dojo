---
id: cses-longest-flight-route
pattern: CSES: graph algorithms
difficulty: medium
optimal: "O(n + m) time, O(n + m) space"
reviewed: false
---

## Clarify first
- Is the graph guaranteed to be acyclic? Yes, the problem statement guarantees that the flight network is a Directed Acyclic Graph (DAG).
- What metric are we maximizing? The maximum number of cities on a directed path from city 1 to city n, counting both endpoint cities.
- What if city n is unreachable from city 1? Return -1.
- Are flight connections directed or bidirectional? Directed flights from city a to city b.
- Can there be nodes that cannot reach city n or cannot be reached from city 1? Yes, irrelevant components must not interfere with the path count.

## Examples to say out loud
Suppose n = 5 and flights are (1, 2), (2, 3), (3, 5), (1, 4), (4, 5), and (1, 5).
There are three candidate paths from 1 to 5:
- Direct flight 1 -> 5 visits 2 cities.
- Route 1 -> 4 -> 5 visits 3 cities.
- Route 1 -> 2 -> 3 -> 5 visits 4 cities.
The longest route visits 4 cities, so we return 4.

If n = 4 and the flights are (1, 2) and (3, 4), city 4 cannot be reached from city 1. The result is -1.

## Brute force
Finding the longest simple path in a general graph is NP-hard. A naive backtracking search that explores every possible directed path from city 1 would take exponential time O(2^n).
However, because this flight network is guaranteed to be a DAG, there are no cycles. Subproblems have optimal substructure with no feedback loops, enabling a linear-time dynamic programming solution over topological order.

## The key observation
In a DAG, all edges point forward according to topological order.
If we sort all vertices topologically, any path from city 1 to city n visits vertices in strictly increasing topological rank.
Let `dp[u]` denote the maximum number of cities on any valid path from city 1 to city u.
By processing vertices in topological order, by the time we reach vertex u, `dp[u]` is already fully finalized. We can then relax every outgoing edge u -> v by considering `dp[v] = max(dp[v], dp[u] + 1)`.

## Optimal approach
1. Build an adjacency list for the directed flights and compute the in-degree of each city.
2. Generate a topological ordering of all cities using Kahn's algorithm (enqueueing cities with in-degree 0 and decrementing neighbor in-degrees).
3. Initialize an array `dp` of size n + 1 with -1 to signify unreachable states. Set `dp[1] = 1` because starting at city 1 counts as 1 visited city.
4. Iterate through vertices u in topological sequence:
   - If `dp[u] == -1`, city u cannot be reached from city 1; continue.
   - For each outgoing flight u -> v:
     - Update `dp[v] = max(dp[v], dp[u] + 1)`.
5. Return `dp[n]`. If `dp[n]` remains -1, city n was unreachable.

Complexity: O(n + m) time because topological sorting and edge relaxation visit every vertex and edge a constant number of times, and O(n + m) space for graph representation and dp array.

## Code walkthrough
In Kahn's algorithm, vertices with `indeg[i] == 0` enter queue `q`. We record each dequeued node into vector `topo` and decrement neighbor degrees.
After generating `topo`, we allocate `vector<int> dp(n + 1, -1)` and set `dp[1] = 1`.
Iterating over `u` in `topo`: the condition `if (dp[u] == -1) continue;` skips vertices that are not reachable from 1, ensuring we do not propagate invalid paths.
For valid `u`, we inspect `adj[u]` and execute `if (dp[u] + 1 > dp[v]) dp[v] = dp[u] + 1;`.
Finally, `return dp[n];` gives the required answer or -1.

## Test it out loud
- Direct connection: n = 2, flight (1, 2). `dp[1] = 1`. Processing 1 updates `dp[2] = 2`. Output: 2.
- Multiple paths of different lengths: n = 3, flights (1, 2), (2, 3), (1, 3). Path 1 -> 3 gives 2; path 1 -> 2 -> 3 gives 3. Output: 3.
- Disconnected target: n = 5, flights (2, 3), (3, 4), (4, 5). City 1 has no outgoing edges. `dp[5]` remains -1. Output: -1.
- Redundant bypasses: n = 4, flights (1, 2), (2, 3), (3, 4), (1, 4). Path through all vertices gives length 4, while shortcut gives 2. Output: 4.

## Follow-ups
- How would you reconstruct the actual city path? Keep an array `parent[n + 1]`. Whenever `dp[u] + 1 > dp[v]`, assign `parent[v] = u`. Backtrack from n to 1 and reverse the list.
- What if edge weights were arbitrary lengths instead of city counts? The exact same DAG DP approach works: `dp[v] = max(dp[v], dp[u] + weight)`.
- What if the graph contained cycles? Longest path in general graphs with cycles is NP-complete, reducing from Hamiltonian Path.

## Common mistakes
- Initializing all `dp[i] = 1` or `0`: only `dp[1]` should start active (at 1). Setting others to 0 would mistakenly allow paths to start from unreached intermediate cities.
- Attempting Dijkstra with negated weights: Dijkstra does not work on graphs with negative weights or arbitrary longest paths, even if acyclic, unless re-modeled carefully. Topological DP is much simpler and strictly linear.
- Overlooking reachability from 1: failing to skip `dp[u] == -1` nodes causes false paths originating from nowhere to reach city n.

## Further reading
- Dynamic programming on Directed Acyclic Graphs
- Longest path problem on DAGs
- Topological ordering properties and Kahn's algorithm
