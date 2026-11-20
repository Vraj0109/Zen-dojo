---
id: cses-course-schedule
pattern: CSES: graph algorithms
difficulty: medium
optimal: "O(n + m) time, O(n + m) space"
reviewed: false
---

## Clarify first
- What do the prerequisite pairs signify? A pair [a, b] means course a must be completed before taking course b (a directed edge from a to b).
- What should be returned? A boolean indicating whether it is possible to complete all courses (true if the graph is a DAG, false if any cycle exists).
- Can there be courses with no prerequisites? Yes, courses without prerequisites can be taken in any order.
- Can there be multiple disconnected components? Yes, each independent component must be acyclic.
- Are self-dependencies possible? The constraints specify a != b, so there are no self-loops.

## Examples to say out loud
Suppose n = 3 and requirements are [1, 2] and [2, 3].
Course 1 has 0 prerequisites. Taking course 1 unlocks course 2, and completing course 2 unlocks course 3. All 3 courses are finished, so we return true.

Suppose n = 3 and requirements are [1, 2], [2, 3], and [3, 1].
Every course has in-degree 1. None of the courses can be taken initially because each depends on another. No course can ever be completed, forming a circular dependency, so we return false.

## Brute force
We could search for cycles by running a depth-first search from every node, tracking recursion stack state. While DFS cycle detection also achieves linear time, an unoptimized search that backtracks along every path could explore exponential paths in dense networks.
Kahn's algorithm using in-degrees provides an iterative, queue-based approach that processes vertices level by level.

## The key observation
A directed graph has a valid course order if and only if it is a Directed Acyclic Graph (DAG).
In any finite DAG, there is always at least one vertex with in-degree 0. Removing such a vertex and its outgoing edges yields a smaller DAG that also has at least one vertex with in-degree 0.
If at any point no vertices have in-degree 0 while unvisited vertices remain, those remaining vertices are involved in one or more cycles.

## Optimal approach
1. Build an adjacency list for n courses and an array `indeg` of size n + 1 recording incoming prerequisite counts for each course.
2. Initialize a queue and enqueue all courses whose `indeg[i] == 0`.
3. Track the count of courses processed so far (or store them in a list).
4. While the queue is not empty:
   - Dequeue course u and increment the processed count.
   - For each dependent neighbor v in `adj[u]`:
     - Decrement `indeg[v]`.
     - If `indeg[v]` drops to 0, enqueue v.
5. If the count of processed courses equals n, return true; otherwise, return false.

Complexity: O(n + m) time because each vertex and directed edge is processed once, and O(n + m) space for adjacency list, in-degree array, and queue.

## Code walkthrough
In step 1, iterating over prerequisites updates `adj[r[0]].push_back(r[1])` and increments `indeg[r[1]]`.
We reserve capacity in our queue vector `q` up to n. Courses from 1 to n with `indeg[i] == 0` are pushed into `q`.
Using a index pointer `head`, we simulate queue pop operations in O(1) time without deque allocation overhead.
For each neighbor `v` of `u`, `if (--indeg[v] == 0) q.push_back(v);` decrements the count and enqueues newly freed courses.
Finally, `return (int)q.size() == n;` verifies whether all n courses were cleared.

## Test it out loud
- Single course with no prerequisites: n = 1, requirements = []. In-degree of course 1 is 0. Processed count becomes 1 == n, returns true.
- Simple 2-course cycle: n = 2, requirements = [[1, 2], [2, 1]]. Both in-degrees are 1. Queue is empty initially. Processed count is 0 != 2, returns false.
- Diamond dependency DAG: n = 4, [1, 2], [1, 3], [2, 4], [3, 4]. Queue starts with {1}. Processing 1 frees 2 and 3. Processing 2 and 3 frees 4. All 4 courses processed, returns true.
- Forest with disconnected components: n = 5, [1, 2], [3, 4]. Course 5 is isolated. 1, 3, and 5 start with in-degree 0. All 5 are completed, returns true.

## Follow-ups
- How would you return an actual valid completion order? Instead of just returning a boolean, the sequence of dequeued vertices in `q` forms an exact valid topological ordering.
- What if the interviewer wants lexicographically smallest topological order? Replace the FIFO queue with a min-heap (priority queue). The complexity becomes O((n + m) * log n).
- Can this be solved using DFS? Yes, using three-state coloring (0 = unvisited, 1 = visiting, 2 = visited). A back-edge to a node in state 1 indicates a cycle.

## Common mistakes
- Misinterpreting edge direction: prerequisite [a, b] means a -> b (a must be done first), so b's in-degree increases, not a's.
- 1-based indexing errors: courses are numbered 1 to n, so allocating arrays of size n instead of n + 1 causes out-of-bounds access.
- Confusing DAG check with connectivity: disconnected DAG components are perfectly valid; initializing the queue across all nodes 1 to n ensures all components are handled.

## Further reading
- Kahn's algorithm for topological sorting
- Tarjan's strongly connected components and cycle detection
- Directed Acyclic Graph properties and dependency resolution
