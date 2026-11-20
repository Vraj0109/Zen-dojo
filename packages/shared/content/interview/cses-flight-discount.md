---
id: cses-flight-discount
pattern: CSES: graph algorithms
difficulty: medium
optimal: "O((n + m) * log n) time, O(n + m) space"
reviewed: false
---

## Clarify first
- How many flights can be discounted? Exactly one flight coupon is available, meaning at most one flight can be halved along the path.
- How is the discount calculated? Floor division: price c becomes floor(c / 2).
- Are flights directed or bidirectional? Directed flights from city a to city b.
- Can costs exceed standard 32-bit limits? Yes, cumulative route costs reach 10^14, requiring 64-bit integers.
- Is city n always reachable from city 1? Yes, the problem guarantees at least one path from 1 to n.

## Examples to say out loud
Suppose n = 3 and flights are (1 -> 2, cost 3) and (2 -> 3, cost 5).
Halving flight 1 gives floor(3 / 2) + 5 = 6. Halving flight 2 gives 3 + floor(5 / 2) = 5. The minimum total cost is 5.
For n = 4 with flights (1 -> 2, cost 100), (2 -> 4, cost 100), (1 -> 3, cost 10), and (3 -> 4, cost 200), route 1 -> 3 -> 4 with (3 -> 4) halved costs 10 + 100 = 110, which beats route 1 -> 2 -> 4 (150).

## Brute force
A naive approach would iterate through every flight, halve its price, and run Dijkstra's algorithm from 1 to n.
Running Dijkstra m times takes O(m * (n + m) * log n) time.
For m = 200,000, this times out severely. We can instead solve all coupon choices in a single shortest-path search.

## The key observation
We model this on an expanded state graph where each city u has two states: (u, 0) for coupon not yet used, and (u, 1) for coupon already used.
Traversing flight (u, v, c) from (u, 0) allows two choices: pay c to reach (v, 0), or pay floor(c / 2) to reach (v, 1).
From (u, 1), the coupon is spent, so we can only transition to (v, 1) with cost c.
Running Dijkstra on this 2n-vertex graph computes the optimal answer in a single pass.

## Optimal approach
1. Build an adjacency list storing pairs (v, c) for each vertex u.
2. Allocate `dist[n + 1][2]` initialized to infinity (4 * 10^18) with `dist[1][0] = 0`.
3. Use a min-priority queue storing tuples (cost, city, coupon_used). Push (0, 1, 0).
4. While the priority queue is non-empty:
   - Pop minimum state (d, u, used). If d > dist[u][used], continue.
   - For each outgoing flight (v, c) from u:
     - If used == 0:
       - Keep coupon: if dist[u][0] + c < dist[v][0], update `dist[v][0]` and push (dist[v][0], v, 0).
       - Use coupon: if dist[u][0] + c / 2 < dist[v][1], update `dist[v][1]` and push (dist[v][1], v, 1).
     - If used == 1:
       - Pay full price: if dist[u][1] + c < dist[v][1], update `dist[v][1]` and push (dist[v][1], v, 1).
5. Return `dist[n][1]`.

Complexity: O((n + m) * log n) time on 2n vertices and 3m edges, and O(n + m) space.

## Code walkthrough
In C++, the priority queue stores `tuple<long long, int, int>` ordered with `greater<State>`.
`dist[1][0] = 0` sets the source. Stale entries are skipped with `if (d > dist[u][used]) continue;`.
When `used == 0`, we attempt relaxations into `dist[v][0]` with cost c and `dist[v][1]` with cost c / 2.
When `used == 1`, only `dist[v][1]` with cost c is relaxed.
Because non-negative weights ensure using the discount never worsens cost, `dist[n][1]` yields the minimal cost.

## Test it out loud
- Odd cost single flight: n = 2, flight (1, 2, 7). Floor division gives 7 / 2 = 3. `dist[2][1] = 3`. Output: 3.
- Cost 1 flight: n = 2, flight (1, 2, 1). 1 / 2 = 0. Output: 0.
- Competing routes: flights (1, 2, 10), (2, 3, 20), (1, 3, 25). Route 1 -> 2 -> 3 halved is 20; direct 1 -> 3 halved is 12. Output: 12.
- 64-bit bounds: edge weights up to 10^9 accumulate past 2^31 - 1, handled correctly by 64-bit integers.

## Follow-ups
- What if there are k discount coupons? Expand state to `dist[n + 1][k + 1]`. Time complexity is O((k * (n + m)) * log(k * n)).
- Can bidirectional Dijkstra be used? Run forward Dijkstra from 1 and reverse Dijkstra from n; then find min over all edges of `dist1[u] + c / 2 + distN[v]`.
- What if discounts were percentage-based? State expansion still works using double precision floating points.

## Common mistakes
- 32-bit integer overflow: path costs reach 10^14, so `long long` is required for all distance calculations.
- Floating-point inaccuracy: using `c / 2` with integer division matches floor division without precision loss.
- Checking only `dist[n][0]`: the coupon is always usable, so `dist[n][1]` is guaranteed to be <= `dist[n][0]`.

## Further reading
- State-space expansion in Dijkstra's shortest path algorithm
- Layered graphs for constrained shortest path problems
- Shortest path heuristics on travel networks
