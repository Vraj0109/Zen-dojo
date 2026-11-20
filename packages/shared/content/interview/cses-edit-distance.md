---
id: cses-edit-distance
pattern: cses-dynamic-programming
difficulty: medium
optimal: "O(n \times m) time and O(m) space"
reviewed: false
---

## Clarify first
- What operations are allowed to transform $s_1$ into $s_2$?
  1. Insert a character.
  2. Delete a character.
  3. Replace a character with another.
- What is the cost of each operation? Each operation has an equal cost of 1.
- What is the objective? Find the minimum total number of operations (the Levenshtein distance) to convert $s_1$ into $s_2$.
- What characters are present? Uppercase and lowercase English letters.
- What are the string length bounds? $1 \le |s_1|, |s_2| \le 5000$.

## Examples to say out loud
- Consider $s_1 = \text{"LOVE"}$ and $s_2 = \text{"MOVIE"}$:
  - Step 1: Replace 'L' with 'M' $\implies \text{"MOVE"}$.
  - Step 2: Insert 'I' before 'E' $\implies \text{"MOVIE"}$.
  - Total operations = 2.
- Consider $s_1 = \text{"ABC"}$ and $s_2 = \text{"ABC"}$:
  - The strings are already identical, 0 operations required.
- Consider $s_1 = \text{"A"}$ and $s_2 = \text{"B"}$:
  - Replace 'A' with 'B' $\implies 1$ operation.

## Brute force
A brute-force recursive approach would try all three operations at each character mismatch. With branching factor 3 and depths up to 5000, recursion takes $O(3^{n + m})$ time, which will result in a Time Limit Exceeded. The Wagner-Fischer 2D dynamic programming algorithm evaluates the edit distance iteratively in $O(n \times m)$ time.

## The key observation
Let $\text{dp}[i][j]$ be the edit distance between the prefix $s_1[0 \dots i - 1]$ (length $i$) and $s_2[0 \dots j - 1]$ (length $j$).
- If $s_1[i - 1] == s_2[j - 1]$: the characters match at zero cost, so $\text{dp}[i][j] = \text{dp}[i - 1][j - 1]$.
- If $s_1[i - 1] \ne s_2[j - 1]$: we choose the cheapest of the three operations:
  1. Deletion from $s_1$: $\text{dp}[i - 1][j] + 1$.
  2. Insertion into $s_1$ (matching $s_2[j - 1]$): $\text{dp}[i][j - 1] + 1$.
  3. Substitution / replacement: $\text{dp}[i - 1][j - 1] + 1$.
  Therefore, $\text{dp}[i][j] = 1 + \min(\text{dp}[i - 1][j], \text{dp}[i][j - 1], \text{dp}[i - 1][j - 1])$.
Because each cell $(i, j)$ depends only on the current row and the previous row, space can be optimized to $O(m)$ using two 1D rows (`prev` and `curr`).

## Optimal approach
1. Let $n = |s_1|$ and $m = |s_2|$.
2. Allocate two arrays `prev` and `curr` of size $m + 1$.
3. Initialize the base row: `prev[j] = j` for $j = 0 \dots m$ (transforming empty string into prefix of length $j$ requires $j$ insertions).
4. For $i$ from $1$ to $n$:
   - Set `curr[0] = i` (transforming prefix of length $i$ to empty string requires $i$ deletions).
   - For $j$ from $1$ to $m$:
     - If $s_1[i - 1] == s_2[j - 1]$:
       - `curr[j] = prev[j - 1]`.
     - Else:
       - `curr[j] = 1 + min({prev[j], curr[j - 1], prev[j - 1]})`.
   - Update `prev = curr`.
5. Return `prev[m]`.

Complexity:
- Time: $O(n \times m)$. For $n, m \le 5000$, total cell computations $\le 2.5 \times 10^7$, running in $\approx 60$ ms in C++.
- Space: $O(m)$ auxiliary space using two rows of length $m + 1$ ($\approx 40$ KB of memory).

## Code walkthrough
- `vector<int> prev(m + 1), curr(m + 1)`: Space-optimized DP buffers.
- `for (int j = 0; j <= m; j++) prev[j] = j`: Base cases for row 0.
- `curr[0] = i`: Base case for column 0 at each step.
- `if (s1[i - 1] == s2[j - 1]) curr[j] = prev[j - 1]`: Matches characters with zero additional cost.
- `curr[j] = 1 + min({prev[j], curr[j - 1], prev[j - 1]})`: Takes the minimum of deletion (`prev[j]`), insertion (`curr[j - 1]`), and substitution (`prev[j - 1]`).
- `prev = curr`: Shifts the completed row to become the previous row for the next character of $s_1$.

## Test it out loud
- Test case $1$: $s_1 = \text{"FOOD"}$, $s_2 = \text{"MONEY"}$. Edit distance is 4.
- Test case $2$: $s_1 = \text{"ABC"}$, $s_2 = \text{"ABC"}$. Returns 0.
- Test case $3$: $s_1 = \text{"ALGORITHM"}$, $s_2 = \text{"LOGARITHM"}$. Edit distance is 3 (delete 'A', insert 'O', replace...).
- Test case $4$: $s_1 = \text{"A"}$, $s_2 = \text{"B"}$. Single replacement $\implies$ returns 1.

## Follow-ups
- How to reduce space to a single 1D array instead of two? Maintain a variable `prev_diag` to store $\text{dp}[i - 1][j - 1]$ before overwriting $\text{dp}[j]$.
- What if the allowed operations also include transposition of adjacent characters (swapping "ab" to "ba")? This becomes the Damerau-Levenshtein distance, handled with one additional transition checking $s_1[i - 2] == s_2[j - 1]$ and $s_1[i - 1] == s_2[j - 2]$.

## Common mistakes
- Allocating a full $5000 \times 5000$ integer matrix: A full 2D table of size $5000 \times 5000$ integers consumes $100$ MB of RAM, which can exceed strict memory limits in competitive environments. Two 1D arrays consume less than $50$ KB.
- 0-based vs 1-based index off-by-one: When computing `curr[j]`, the characters compared are $s_1[i - 1]$ and $s_2[j - 1]$. Forgetting $-1$ causes index out-of-bounds or misaligned character comparisons.

## Further reading
- [Levenshtein Distance on Wikipedia](https://en.wikipedia.org/wiki/Levenshtein_distance)
