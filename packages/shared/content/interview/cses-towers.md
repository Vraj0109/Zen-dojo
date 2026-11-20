---
id: cses-towers
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log n) time and O(n) space"
reviewed: false
---

## Clarify first
- What are the rules for placing cubes into towers?
  1. Each cube must either be placed on top of an existing tower or start a new tower.
  2. A cube may only be placed on an existing tower if its size is strictly smaller than the cube currently on top of that tower.
- In what order are cubes placed? Cubes must be processed in the exact order they appear in the input array.
- What should be returned? The minimum number of towers needed to place all cubes.
- What are the constraints? $1 \le n \le 200000$ and $1 \le \text{cubes}[i] \le 10^9$.

## Examples to say out loud
- Consider `cubes = [3, 8, 2, 1, 5]`:
  - Cube 3: No towers exist $\to$ starts Tower 1 (top = 3). Tops: `[3]`.
  - Cube 8: Cannot go on 3 ($8 \not< 3$) $\to$ starts Tower 2 (top = 8). Tops: `[3, 8]`.
  - Cube 2: Can go on 3 or 8. Smallest strictly greater top is 3 $\to$ place on Tower 1. Top becomes 2. Tops: `[2, 8]`.
  - Cube 1: Can go on 2 or 8. Smallest strictly greater top is 2 $\to$ place on Tower 1. Top becomes 1. Tops: `[1, 8]`.
  - Cube 5: Can go on 8. Place on Tower 2. Top becomes 5. Tops: `[1, 5]`.
  - Total towers needed: 2.
- Edge case: strictly increasing cubes `[1, 2, 3, 4]`:
  - Each cube is larger than all existing tops $\to$ 4 towers.

## Brute force
A brute-force strategy would iterate through all existing towers for each cube and pick the one with the smallest compatible top. If we maintain an unsorted list of tower tops, searching for the smallest top $> c$ takes $O(k)$ time, leading to $O(n^2)$ time in the worst case (when $k \approx n$). For $n = 200000$, $4 \times 10^{10}$ operations causes a Time Limit Exceeded. By maintaining tower tops in sorted order, binary search resolves each placement in $O(\log n)$ time.

## The key observation
If multiple existing towers have tops strictly greater than cube $c$, which tower should we choose?
Greedy choice: Place $c$ on the tower whose top is the **smallest** among all tops strictly greater than $c$.
Why? Using a smaller valid top leaves larger tops available for even bigger future cubes. Replacing that top with $c$ tightens the bound as minimally as possible.
Furthermore, the greedy strategy keeps the list of tower tops in non-decreasing order! Therefore, finding the smallest top $> c$ corresponds exactly to `std::upper_bound(c)` in a sorted vector. If no top $> c$ exists, a new tower with top $c$ must be created.

## Optimal approach
1. Initialize an empty dynamic array `tops` to store the top element of each active tower.
2. For each cube $c$ in `cubes`:
   - Find the first tower top strictly greater than $c$ using binary search (`upper_bound` in `tops`).
   - If no such tower exists (`it == tops.end()`):
     - Append $c$ to the end of `tops` (starting a new tower).
   - Otherwise:
     - Replace the top of that tower with $c$: `*it = c`.
3. Return the size of `tops`.

Complexity:
- Time: $O(n \log n)$ because for each of the $n$ cubes, we perform a binary search over at most $n$ sorted elements in $O(\log n)$ time.
- Space: $O(n)$ to store the array of tower tops.

## Code walkthrough
- `vector<int> tops`: Holds the current top cubes of all towers in sorted order.
- `for (int c : cubes)`: Sequentially processes cubes in the specified arrival order.
- `auto it = upper_bound(tops.begin(), tops.end(), c)`: Searches for the smallest top strictly greater than $c$.
- `if (it == tops.end()) tops.push_back(c)`: No existing tower can accept $c$, so a new tower is instantiated.
- `else *it = c`: Places $c$ on the best tower, replacing that tower's top value with $c$ while preserving sorted order in `tops`.
- `return (int)tops.size()`: The final number of towers equals the count of surviving tops.

## Test it out loud
- Test case $1$: `[5, 4, 3, 2, 1]`. Strictly decreasing: each cube stacks on top of the previous one. Tops: $[5] \to [4] \to [3] \to [2] \to [1]$. Returns 1.
- Test case $2$: `[7, 7, 7, 7]`. Equal sizes: a cube must be *strictly* smaller to stack. Each 7 starts a new tower $\implies$ returns 4.
- Test case $3$: `[10]`. Single cube $\implies$ returns 1.
- Test case $4$: `[4, 2, 8, 5, 1, 9]`. Tops progression: $[4] \to [2] \to [2, 8] \to [2, 5] \to [1, 5] \to [1, 5, 9]$. Returns 3.

## Follow-ups
- How does this relate to Dilworth's Theorem? By Dilworth's theorem, the minimum number of towers (chains in a poset) equals the length of the longest non-decreasing subsequence (antichain) of cubes.
- What if cubes of equal size could be placed on top of each other? We would use `lower_bound` instead of `upper_bound` to find the smallest top $\ge c$.

## Common mistakes
- Using `lower_bound` instead of `upper_bound`: The problem requires the new cube to be *strictly smaller* than the top cube ($c < \text{top} \iff \text{top} > c$). `lower_bound` would allow $c == \text{top}$, which violates the strict constraint.
- Linear search through tower tops: Iterating linearly through towers takes $O(n^2)$ time, failing on large tests.

## Further reading
- [Dilworth's Theorem on Wikipedia](https://en.wikipedia.org/wiki/Dilworth%27s_theorem)
