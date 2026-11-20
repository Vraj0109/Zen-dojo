---
id: cses-grid-coloring-i
pattern: cses-introductory
difficulty: medium
optimal: "O(R \times C) time and O(R \times C) space"
reviewed: false
---

## Clarify first
- What are the dimensions and letters involved? An $R \times C$ grid containing the uppercase letters 'A', 'B', 'C', and 'D'.
- What are the recoloring rules?
  1. The new letter in every cell must differ from the original letter in that cell.
  2. Any two horizontally or vertically adjacent cells must have different new letters.
- How are ties broken among multiple valid recolorings? Return the lexicographically smallest grid when read in row-major order (top-to-bottom, left-to-right).
- What are the grid constraints? $1 \le R, C \le 500$.

## Examples to say out loud
- Consider a $1 \times 1$ grid `[["A"]]`:
  - Cell $(0, 0)$ originally had 'A'.
  - No neighbors. Allowed letters: 'B', 'C', 'D'.
  - Alphabetically smallest allowed letter is 'B'.
  - Output: `["B"]`.
- Consider $1 \times 2$ grid `[["AB"]]`:
  - Cell $(0, 0)$: original 'A', no left/top neighbors. Pick 'B'.
  - Cell $(0, 1)$: original 'B', left neighbor is 'B'. Pick smallest remaining letter $\ne \text{'B'}$, which is 'A'.
  - Output: `["BA"]`.
- Consider $2 \times 2$ grid `[["AA"], ["AA"]]`:
  - $(0, 0)$: orig 'A' $\to$ 'B'.
  - $(0, 1)$: orig 'A', left 'B' $\to$ 'C'.
  - $(1, 0)$: orig 'A', top 'B' $\to$ 'C'.
  - $(1, 1)$: orig 'A', left 'C', top 'C' $\to$ 'B'.
  - Output: `["BC", "CB"]`.

## Brute force
A brute-force backtracking approach would try letters 'A' through 'D' for each cell and backtrack if a conflict arose later. Because the grid has up to $500 \times 500 = 250000$ cells, backtracking search could take exponential time. However, because four colors are available and each cell has at most three constraints, a greedy choice never leads to a dead end.

## The key observation
For any cell $(i, j)$ in row-major order:
1. The new letter cannot match the original letter `grid[i][j]`.
2. The new letter cannot match the new letter assigned to its left neighbor $(i, j - 1)$ (if $j > 0$).
3. The new letter cannot match the new letter assigned to its top neighbor $(i - 1, j)$ (if $i > 0$).
These three conditions forbid at most 3 distinct letters. Because we have 4 letters available ('A', 'B', 'C', 'D'), by the Pigeonhole Principle, there is always at least one legal letter remaining ($4 - 3 = 1$). Furthermore, picking the smallest available letter for the current cell will never constrain future cells beyond the same bound of at most 3 forbidden letters. Thus, a greedy scan in row-major order always succeeds and guarantees the lexicographically smallest recoloring.

## Optimal approach
1. Allocate an output grid of size $R \times C$.
2. Iterate through rows $i$ from $0$ to $R - 1$:
   - Iterate through columns $j$ from $0$ to $C - 1$:
     - Loop character `ch` through 'A', 'B', 'C', 'D':
       - If `ch == grid[i][j]`, continue.
       - If $j > 0$ and `out[i][j - 1] == ch`, continue.
       - If $i > 0$ and `out[i - 1][j] == ch`, continue.
       - Assign `out[i][j] = ch` and break to the next cell.
3. Return the recolored grid.

Complexity:
- Time: $O(R \times C)$ since each cell checks at most 4 characters with 3 constant-time comparisons.
- Space: $O(R \times C)$ to hold the recolored result.

## Code walkthrough
- `int r = (int)grid.size(), c = (int)grid[0].size()`: Captures grid dimensions.
- `vector<string> out(r, string(c, 'A'))`: Output buffer of strings.
- `for (char ch = 'A'; ch <= 'D'; ch++)`: Evaluates candidates in alphabetical order.
- `if (ch == grid[i][j]) continue`: Enforces difference from original cell character.
- `if (j > 0 && out[i][j - 1] == ch) continue`: Prevents horizontal color collision.
- `if (i > 0 && out[i - 1][j] == ch) continue`: Prevents vertical color collision.
- `out[i][j] = ch; break`: Locks in the first legally compliant character and moves forward.

## Test it out loud
- Test case $1$: `[["A"]]` $\implies$ tries 'A' (matches orig, skipped), tries 'B' (valid, chosen). Returns `["B"]`.
- Test case $2$: `[["AB"]]` $\implies (0, 0)$ gets 'B'; $(0, 1)$ cannot take 'B' (orig & left) $\implies$ takes 'A'. Returns `["BA"]`.
- Test case $3$: `[["A","B","C","D"]]` $\implies$ alternate sequence: 'B', 'A', 'B', 'A'.
- Test case $4$: $2 \times 2$ identical cells $\implies$ checks top and left simultaneously.

## Follow-ups
- Why does the Four Color Theorem apply here? Planar graphs are 4-colorable, and grid graphs are bipartite (2-colorable without the original color constraint). Adding the original-cell constraint adds 1 forbidden color, bringing total degrees of constraint to $\le 3$, which 4 colors can always satisfy.
- What if 3 colors were given instead of 4? With 3 colors, a cell could have its original color and two distinct neighbor colors taking all 3 choices, making the problem NP-complete in general.

## Common mistakes
- Checking future neighbors: Cells $(i + 1, j)$ and $(i, j + 1)$ have not been colored yet in row-major order. Checking uninitialized cells causes bugs.
- Not checking the original letter: Missing `ch == grid[i][j]` violates the primary rule that the cell's color must change.

## Further reading
- [Graph Coloring on Wikipedia](https://en.wikipedia.org/wiki/Graph_coloring)
