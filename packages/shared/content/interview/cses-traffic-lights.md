---
id: cses-traffic-lights
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log n) time and O(n) space"
reviewed: false
---

## Clarify first
- What are the dimensions? A street of length $X$ extending from 0 to $X$.
- When are traffic lights placed? Traffic lights are installed one by one at given positions.
- What should be computed at each step? Immediately after each traffic light is installed, output the length of the longest passage without any traffic lights.
- What are the constraints? $1 \le X \le 10^9$, $1 \le n \le 200000$, and all positions are distinct integers between 1 and $X - 1$.

## Examples to say out loud
- Consider $X = 8$ and `positions = [3, 6, 2]`:
  - Initially: street has single passage $[0, 8]$ of length 8.
  - Install light at 3: splits $[0, 8]$ into $[0, 3]$ (length 3) and $[3, 8]$ (length 5). Longest passage = 5.
  - Install light at 6: falls inside $[3, 8]$, splitting into $[3, 6]$ (length 3) and $[6, 8]$ (length 2). Passages: $[0, 3]$ (3), $[3, 6]$ (3), $[6, 8]$ (2). Longest passage = 3.
  - Install light at 2: falls inside $[0, 3]$, splitting into $[0, 2]$ (length 2) and $[2, 3]$ (length 1). Longest passage remains 3.
  - Output: `[5, 3, 3]`.

## Brute force
A brute force approach would maintain a sorted list of light positions, insert the new light, compute all adjacent differences between consecutive lights, and take the maximum. Inserting takes $O(n)$ with vector shifts and scanning takes $O(n)$, giving $O(n^2)$ time overall. For $n = 200000$, $4 \times 10^{10}$ operations causes a Time Limit Exceeded. Balanced search trees allow updating and querying the maximum in $O(\log n)$ time per light.

## The key observation
When a new traffic light is installed at coordinate $p$, it only affects the single contiguous passage $[L, R]$ in which it lands (where $L < p < R$).
The interval $[L, R]$ is destroyed, and two smaller intervals $[L, p]$ and $[p, R]$ are created. All other passages on the street remain completely unchanged.
Therefore, if we maintain:
1. An ordered set of all light positions (seeded with $\{0, X\}$),
2. A multiset (or max-heap/frequency map) of all active passage lengths (seeded with $\{X\}$),
we can locate $L$ and $R$ in $O(\log n)$ via `upper_bound`, remove the old length $(R - L)$, insert the two new lengths $(p - L)$ and $(R - p)$, and query the maximum length via `*lengths.rbegin()`.

## Optimal approach
1. Initialize an ordered `set<int> lights = {0, streetLength}`.
2. Initialize an ordered `multiset<int> lens = {streetLength}`.
3. Allocate a result vector `ans` of capacity $n$.
4. For each light position $p$ in `positions`:
   - Find the successor position $R$ using `it = lights.upper_bound(p)`.
   - Find the predecessor position $L$ using `*prev(it)`.
   - Erase one instance of the old length $(R - L)$ from `lens`: `lens.erase(lens.find(R - L))`.
   - Insert $(p - L)$ and $(R - p)$ into `lens`.
   - Insert $p$ into `lights`.
   - Append the maximum length `*lens.rbegin()` to `ans`.
5. Return `ans`.

Complexity:
- Time: $O(n \log n)$ because for each of the $n$ lights, set lookups, deletions, and insertions take $O(\log n)$ operations.
- Space: $O(n)$ to store $n + 2$ light positions and passage lengths.

## Code walkthrough
- `set<int> lights = {0, streetLength}`: Stores the boundaries and all installed traffic light locations.
- `multiset<int> lens = {streetLength}`: Stores the lengths of all current contiguous passages.
- `int r = *it; int l = *prev(it)`: Identifies the exact segment $[l, r]$ containing $p$.
- `lens.erase(lens.find(r - l))`: Removes exactly one copy of the previous passage length.
- `lens.insert(p - l); lens.insert(r - p)`: Adds the two newly subdivided passage lengths.
- `ans.push_back(*lens.rbegin())`: Fetches the largest passage length in $O(1)$ time from the multiset.

## Test it out loud
- Test case $1$: $X = 5$, `positions = [1, 2, 3, 4]`. Lengths decrease from $4 \to 3 \to 2 \to 1$. Returns `[4, 3, 2, 1]`.
- Test case $2$: $X = 100$, `positions = [50]`. Splits into two segments of 50. Returns `[50]`.
- Test case $3$: $X = 20$, `positions = [15, 5, 10]`. Returns `[15, 10, 5]`.
- Test case $4$: $X = 10^9$. Coordinate values fit within 32-bit signed integers; returns valid lengths up to $10^9$.

## Follow-ups
- How to solve this in $O(n)$ time offline? Process operations in reverse! Insert all lights first, find the maximum passage, and use Disjoint Set Union (DSU) to merge intervals as lights are removed from last to first, tracking the max component size.
- What if multiple lights can be placed at the same coordinate? Use coordinate validation or duplicate checks before splitting.

## Common mistakes
- Erasing by value in `std::multiset`: Calling `lens.erase(r - l)` will delete *all* passages that happen to have length $r - l$, corrupting the multiset. You must call `lens.erase(lens.find(r - l))` to delete only the single specific passage.
- Attempting to use a boolean array of size $10^9$: $X$ can be up to $10^9$, requiring coordinate-based representations rather than array index allocations.

## Further reading
- [Binary Search Trees and Multisets on Wikipedia](https://en.wikipedia.org/wiki/Self-balancing_binary_search_tree)
