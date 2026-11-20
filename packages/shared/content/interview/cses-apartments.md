---
id: cses-apartments
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log n + m \log m) time and O(1) space"
reviewed: false
---

## Clarify first
- What are the inputs? An array of $n$ applicants' desired apartment sizes, an array of $m$ available apartment sizes, and an integer tolerance $k$.
- When does an apartment match an applicant? An apartment of size $s$ matches an applicant with desired size $d$ if $d - k \le s \le d + k$.
- How many apartments can an applicant get, and how many applicants can an apartment serve? At most one applicant per apartment, and at most one apartment per applicant.
- What should be returned? The maximum number of applicants who can obtain an apartment.
- What are the constraints? $1 \le n, m \le 200000$, and $0 \le k, \text{sizes} \le 10^9$.

## Examples to say out loud
- Consider `applicants = [60, 45, 80, 60]`, `apartments = [30, 60, 75]`, and $k = 5$:
  - Sort applicants: `[45, 60, 60, 80]`.
  - Sort apartments: `[30, 60, 75]`.
  - Applicant 45 with apartment 30: $30 < 45 - 5 = 40$. Apartment 30 is too small for applicant 45 and will also be too small for all larger applicants. Discard apartment 30.
  - Applicant 45 with apartment 60: $60 > 45 + 5 = 50$. Apartment 60 is too large for applicant 45. Move to next applicant.
  - Applicant 60 with apartment 60: $60 - 5 \le 60 \le 60 + 5$, valid match. Increment match to 1, advance both.
  - Applicant 60 with apartment 75: $75 > 65$, too large for applicant 60. Advance applicant.
  - Applicant 80 with apartment 75: $80 - 5 \le 75 \le 80 + 5$, valid match. Increment match to 2, advance both.
  - Total matches: 2.

## Brute force
A brute-force maximum bipartite matching algorithm (such as the Hopcroft-Karp algorithm or Ford-Fulkerson max flow) would construct a bipartite graph with edges between every compatible applicant and apartment. With $V = n + m \le 400000$ and potentially $O(n \times m) \approx 4 \times 10^{10}$ edges, bipartite matching algorithms will suffer from severe Time Limit Exceeded. By sorting both arrays, a greedy two-pointer strategy matches the optimal maximum in $O((n + m) \log (n + m))$ time.

## The key observation
If we process both applicants and apartments in ascending order of size:
1. If the current apartment is strictly smaller than the applicant's lower bound ($s < d - k$), then because all subsequent applicants desire even larger sizes, this apartment can never satisfy any remaining applicant. We can safely discard this apartment and advance to the next apartment.
2. If the current apartment is strictly larger than the applicant's upper bound ($s > d + k$), then because all subsequent apartments are even larger, no remaining apartment can satisfy this applicant. We must advance to the next applicant.
3. If the apartment falls within $[d - k, d + k]$, greedily pairing them is always optimal because saving this apartment for a future applicant could only hurt or match our options, never improve them.

## Optimal approach
1. Sort `applicants` in ascending order.
2. Sort `apartments` in ascending order.
3. Initialize pointers $i = 0$ (for applicants), $j = 0$ (for apartments), and `matched = 0`.
4. While $i < n$ and $j < m$:
   - If $\text{apartments}[j] < \text{applicants}[i] - k$, increment $j$.
   - Else if $\text{apartments}[j] > \text{applicants}[i] + k$, increment $i$.
   - Else: increment `matched`, increment $i$, and increment $j$.
5. Return `matched`.

Complexity:
- Time: $O(n \log n + m \log m)$ for sorting, followed by a linear $O(n + m)$ two-pointer sweep.
- Space: $O(1)$ auxiliary space beyond the sorting stack.

## Code walkthrough
- `sort(applicants.begin(), applicants.end())`: Orders applicants from smallest desired size to largest.
- `sort(apartments.begin(), apartments.end())`: Orders available units from smallest to largest.
- `if (apartments[j] < applicants[i] - k) j++`: Drops an apartment that is too small to satisfy any current or subsequent applicant.
- `else if (apartments[j] > applicants[i] + k) i++`: Skips an applicant who cannot be satisfied by this or any larger apartment.
- `else { matched++; i++; j++; }`: Pairs the applicant and apartment, advancing both pointers.

## Test it out loud
- Test case $1$: `applicants = [10, 20, 30]`, `apartments = [5, 15, 25]`, $k = 5$: Pairs $(10, 5), (20, 15), (30, 25) \implies 3$ matches.
- Test case $2$: `applicants = [100, 200]`, `apartments = [10, 20]`, $k = 5$: All apartments too small $\implies 0$ matches.
- Test case $3$: `applicants = [50]`, `apartments = [50]`, $k = 0$: Exact match $\implies 1$ match.

## Follow-ups
- What if an apartment could accommodate up to $C$ applicants? We would maintain a capacity counter for each apartment before advancing pointer $j$.
- What if applicants had priorities? Priority-based greedy would require sorting by priority and using a balanced binary search tree (`multiset`) to find the smallest suitable apartment for high-priority applicants.

## Common mistakes
- Underflow in integer subtraction: If using unsigned integers, evaluating $\text{applicants}[i] - k$ when $k > \text{applicants}[i]$ causes underflow wrapping. Working with signed 64-bit integers or writing the condition as $\text{apartments}[j] + k < \text{applicants}[i]$ avoids this issue.
- Reusing an apartment or applicant: Advancing only one pointer instead of both upon a match will mistakenly allocate one entity multiple times.

## Further reading
- [Two Pointers Technique on Wikipedia](https://en.wikipedia.org/wiki/Two-pointer_technique)
