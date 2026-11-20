---
id: c-cf-344a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) space"
reviewed: false
---

## Clarify first
- How are magnets represented? Each domino-shaped magnet is a 2-character string: either `"10"` (positive-negative) or `"01"` (negative-positive).
- How do magnets interact?
  - Magnets placed in a row with opposite poles touching (e.g. `"10"` followed by `"10"`, where negative '0' meets positive '1') attract and cling together into the same group.
  - Magnets with like poles touching (e.g. `"10"` followed by `"01"`, where '0' meets '0'; or `"01"` followed by `"10"`, where '1' meets '1') repel each other and form separate groups.
- What should be returned? The total number of separate groups formed by the row of magnets.
- What are the constraints? The number of magnets $n$ is between 1 and 100,000.

## Examples to say out loud
- Consider `magnets = ["10", "10", "10", "01", "10", "10"]`.
  - Magnets 0, 1, 2 are all `"10"`, clinging together as Group 1: `["10", "10", "10"]`.
  - Magnet 3 is `"01"`, which repels the previous `"10"`. Starts Group 2: `["01"]`.
  - Magnet 4 is `"10"`, which repels the previous `"01"`. Starts Group 3: `["10", "10"]`.
  Total groups formed: 3.
- Consider `magnets = ["01", "10", "10", "01"]`.
  - Group 1: `["01"]`
  - Group 2: `["10", "10"]`
  - Group 3: `["01"]`
  Total groups: 3.
- Edge case: `magnets = ["10"]` $\to$ single magnet forms 1 group $\to$ returns 1.

## Brute force
Because every magnet must be inspected to detect repulsion boundaries, any valid algorithm must read the sequence of magnets. Counting transitions between adjacent magnets takes a single linear scan in $O(n)$ time and $O(1)$ space, which is already optimal.

## The key observation
Two consecutive magnets belong to the same group if and only if their orientations are identical ($magnets[i] == magnets[i - 1]$).
Whenever an adjacent magnet has a different orientation ($magnets[i] \ne magnets[i - 1]$), like poles meet (either '0' meets '0' or '1' meets '1'), creating a repulsion boundary and starting a brand new group.
Therefore:
The number of groups is $1$ (for the first magnet) plus the number of transition points $i \ge 1$ where $magnets[i] \ne magnets[i - 1]$.

## Optimal approach
1. If the array is empty, return 0.
2. Initialize `groups = 1` (the first magnet starts the first group).
3. Loop index $i$ from 1 to $n - 1$:
   - If $magnets[i] \ne magnets[i - 1]$:
     - Increment `groups++`.
4. Return `groups`.
5. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the number of magnets (up to 100,000). A single linear pass compares adjacent 2-character strings.
   - Space Complexity: $O(1)$ auxiliary space.

## Code walkthrough
- `if (magnets.empty()) return 0;`: Handle empty list edge case.
- `int groups = 1;`: Start with 1 group for the initial magnet.
- `for (size_t i = 1; i < magnets.size(); i++)`: Compare each magnet with its immediate predecessor.
- `if (magnets[i] != magnets[i - 1]) groups++;`: Increment group count whenever orientation switches.
- `return groups;`: Total separated groups.

## Test it out loud
- Test 1: `["10"]` $\to$ loop does not run $\to$ returns 1.
- Test 2: `["01", "01", "01"]` $\to$ identical magnets, no transitions $\to$ returns 1.
- Test 3: `["10", "01", "10", "01"]` $\to$ transitions at $i=1, 2, 3 \to 1 + 3 = 4$.
- Test 4: `["01", "10"]` $\to$ transition at $i=1 \to 1 + 1 = 2$.
- Test 5: `["10", "10"]` $\to$ returns 1.

## Follow-ups
- How to check without string comparisons?
  Check only the first character: $magnets[i][0] \ne magnets[i - 1][0]$, since `"10"` and `"01"` differ on their first character. This compares single characters rather than 2-character strings.
- What if magnets could have 3 orientations or different lengths?
  The same rule applies: a new group begins whenever adjacent blocks do not match.

## Common mistakes
- Starting `groups = 0` instead of `1`, returning one fewer group than actually formed.
- Index out of bounds by accessing $magnets[i - 1]$ when $i = 0$.
