---
id: c-cf-158b
pattern: cses-codeforces
difficulty: medium
optimal: "O(n) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first

- What capacity does each taxi have? (Each taxi holds a maximum of 4 passengers).
- Can groups of children be separated? (No, each group must ride together in the exact same taxi; a group cannot be split across taxis).
- Can a single taxi carry multiple different groups? (Yes, multiple groups can share a taxi provided their combined total number of passengers does not exceed 4).
- What are the constraints on group sizes and total groups? (`1 <= groups.length <= 100000`, and each group size $1 \le groups[i] \le 4$).
- What should be returned? (The minimum number of taxis required to transport all schoolchildren).

## Examples to say out loud

- Standard packing: `groups = [1, 2, 4, 3, 3]`.
  - Group of 4 requires its own taxi (Taxi 1).
  - First group of 3 pairs with the group of 1: $3 + 1 = 4$ (Taxi 2).
  - Second group of 3 takes its own taxi, leaving 1 seat empty (Taxi 3).
  - Group of 2 takes its own taxi, leaving 2 seats empty (Taxi 4).
  - Total taxis: 4.
- All groups of two: `groups = [2, 2, 2, 2]`. Two taxis holding $2 + 2 = 4$ each. Output is 2.
- Single group: `groups = [1]`. 1 taxi needed. Output is 1.

## Brute force

A brute-force bin-packing search attempts all possible assignments of groups to taxis. Because bin packing is NP-hard in the general case, testing combinations recursively takes exponential time ($O(n!)$ or $O(4^n)$). However, because group sizes are strictly bounded between 1 and 4, this is a highly constrained version of bin packing that can be solved greedily in linear time.

## The key observation

Because taxi capacity is exactly 4 and group sizes are integers from 1 to 4:
1. Every group of size 4 must take an entire taxi alone.
2. A group of size 3 can only share a taxi with a group of size 1. Pairing each 3 with a 1 is always optimal because size 1 groups are the only ones small enough to fit.
3. Groups of size 2 can pair with each other (two groups of size 2 per taxi). If an odd group of size 2 remains, it takes a taxi and can accommodate up to two groups of size 1.
4. Any remaining groups of size 1 can be packed 4 per taxi: $\lceil \text{remaining\_ones} / 4 \rceil$.

## Optimal approach

1. Count the frequency of each group size: `c[1], c[2], c[3], c[4]`.
2. Allocate one taxi for each group of 4: `taxis = c[4]`.
3. Allocate one taxi for each group of 3: `taxis += c[3]`.
4. Fill seats in size-3 taxis with groups of size 1: `ones = max(0, c[1] - c[3])`.
5. Pair groups of size 2 together: `taxis += c[2] / 2`.
6. If a group of size 2 remains (`c[2] % 2 != 0`):
   - Allocate 1 taxi for it: `taxis++`.
   - It can absorb up to two size-1 groups: `ones = max(0, ones - 2)`.
7. Pack all remaining size-1 groups: `taxis += (ones + 3) / 4`.
8. Return `taxis`.

Complexity:
- Time: `O(n)` where $n$ is the number of groups, to build the 4-element frequency array. The subsequent math takes $O(1)$ operations.
- Space: `O(1)` auxiliary space for the fixed 5-element count array.

## Code walkthrough

In the reference implementation:
- `int c[5] = {0}; for (int g : groups) c[g]++;`: counts group sizes 1, 2, 3, and 4 in linear time.
- `int taxis = c[4] + c[3];`: greedily allocates full taxis for all groups of 4 and 3.
- `int ones = max(0, c[1] - c[3]);`: computes how many size-1 groups remain after filling the fourth seat in taxis carrying a group of 3.
- `taxis += c[2] / 2;`: pairs groups of 2 together ($2 + 2 = 4$).
- `if (c[2] % 2) { taxis++; ones = max(0, ones - 2); }`: handles the leftover group of 2, using its remaining 2 seats to absorb up to two 1s.
- `taxis += (ones + 3) / 4;`: uses ceiling division to pack any remaining 1s four to a car.

## Test it out loud

- `groups = [4, 4, 4]`:
  - `c[4] = 3`. Total taxis: 3. Returns 3.
- `groups = [1, 1, 1, 1, 1]`:
  - `ones = 5`. `(5 + 3) / 4 = 2` taxis. Returns 2.
- `groups = [3, 3, 3, 1]`:
  - 3 groups of 3 $\implies 3$ taxis. One 3 pairs with the single 1 $\implies$ 0 ones remain. Total taxis: 3. Returns 3.

## Follow-ups

- What if taxi capacity is $K$ instead of 4?
  If $K$ is arbitrary and group sizes are up to $K$, the problem becomes equivalent to general Bin Packing, which is NP-hard. Approximation algorithms (such as First Fit Decreasing) achieve within $11/9 \cdot \text{OPT} + 1$.
- What if groups could be split?
  If groups could split across taxis, the problem would simply be $\lceil \sum \text{groups}[i] / 4 \rceil$.

## Common mistakes

- Pairing groups of size 2 with groups of size 1 before pairing 2s with other 2s, which wastes capacity.
- Summing all group sizes and dividing by 4, which fails because groups cannot be split (e.g., $[3, 3]$ has sum 6, $6 / 4 = 1.5 \to 2$ taxis, which matches, but $[2, 3]$ has sum 5, $\lceil 5 / 4 \rceil = 2$, but $[3, 3, 3]$ has sum 9, $\lceil 9 / 4 \rceil = 3$, whereas three 3s need 3 taxis).
- Forgetting that an isolated group of 2 can absorb up to two 1s, not just one 1.

## Further reading

- Bin packing problem heuristics and First Fit Decreasing.
- Greedy algorithm exchange arguments.
