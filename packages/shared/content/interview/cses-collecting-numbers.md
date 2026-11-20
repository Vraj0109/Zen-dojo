---
id: cses-collecting-numbers
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n) time and O(n) space"
reviewed: false
---

## Clarify first
- What are the inputs? An array of size $n$ containing a permutation of the integers from $1$ to $n$.
- What is the collection rule? We must collect the numbers in strict ascending order: first 1, then 2, then 3, up to $n$.
- What does a round consist of? A round scans the array from left to right (from index 0 to $n - 1$). In that pass, we collect any number that is the next required number.
- What should be returned? The minimum number of left-to-right rounds needed to collect all $n$ numbers.
- What are the constraints? $1 \le n \le 200000$.

## Examples to say out loud
- Consider `arr = [4, 2, 1, 5, 3]`:
  - Number 1 is at index 2.
  - Number 2 is at index 1.
  - Number 3 is at index 4.
  - Number 4 is at index 0.
  - Number 5 is at index 3.
  - In round 1:
    - We look for 1: found at index 2.
    - We then look for 2 in the same pass: but 2 was at index 1 (to the left of 1). So 2 cannot be collected in round 1.
    - Round 1 only collects 1.
  - Round 2:
    - Collects 2 (index 1), then 3 (index 4).
    - 4 is at index 0 (to the left of 3), so 4 cannot be collected in round 2.
  - Round 3:
    - Collects 4 (index 0), then 5 (index 3).
  - Total rounds: 3.
- Example 2: `arr = [1, 2, 3, 4, 5]`:
  - Every number $x$ appears to the right of $x - 1$.
  - All collected in 1 round.

## Brute force
A brute force approach would literally simulate the scanning rounds: maintain a pointer `cur = 1`, and repeatedly scan the array from left to right, incrementing `cur` whenever `arr[i] == cur`, and counting each full pass until `cur > n`. In the worst case (e.g. reverse permutation $[n, n-1, \dots, 1]$), this simulation takes $n$ rounds with $n$ operations per round, totaling $O(n^2)$ time. For $n = 200000$, $4 \times 10^{10}$ operations causes a Time Limit Exceeded. Inverting positions solves it in a single $O(n)$ pass.

## The key observation
Can number $x$ be collected in the exact same left-to-right sweep as number $x - 1$?
Yes, if and only if the position of $x$ in the array is strictly greater than the position of $x - 1$:
$$\text{pos}[x] > \text{pos}[x - 1]$$
If $\text{pos}[x] < \text{pos}[x - 1]$, then by the time we collect $x - 1$ at index $\text{pos}[x - 1]$, the scanner has already passed index $\text{pos}[x]$. Therefore, $x$ cannot be collected in that round, forcing the start of a brand new round.
Consequently, every inversion in positions between consecutive values ($\text{pos}[x] < \text{pos}[x - 1]$) necessitates exactly one additional round.

## Optimal approach
1. Allocate an array `pos` of size $n + 1$ to store the 0-based index of each value.
2. Iterate $i$ from $0$ to $n - 1$ and record `pos[arr[i]] = i`.
3. Initialize `rounds = 1`.
4. Iterate $x$ from $2$ to $n$:
   - If $\text{pos}[x] < \text{pos}[x - 1]$, increment `rounds`.
5. Return `rounds`.

Complexity:
- Time: $O(n)$ because we perform one linear scan to record positions and a second linear scan from $2$ to $n$.
- Space: $O(n)$ to store the position lookup table.

## Code walkthrough
- `vector<int> pos(n + 1)`: Maps each value $1 \dots n$ to its original array index.
- `for (int i = 0; i < n; i++) pos[arr[i]] = i`: Fills the inverse permutation table.
- `int rounds = 1`: The first pass always takes at least 1 round.
- `for (int x = 2; x <= n; x++)`: Checks adjacency of consecutive numbers in the value domain.
- `if (pos[x] < pos[x - 1]) rounds++`: Whenever a required number lies behind the preceding number in the array, a new round is triggered.

## Test it out loud
- Test case $1$: `[5, 4, 3, 2, 1]`. $\text{pos} = [4, 3, 2, 1, 0]$. Every consecutive step decreases position ($3 < 4, 2 < 3, \dots$). Triggers 4 additional rounds, total = 5 rounds.
- Test case $2$: `[1]`. Single element $\implies$ loop from 2 to 1 does not run, returns 1.
- Test case $3$: `[2, 1]`. $1$ is at index 1, $2$ is at index 0. $\text{pos}[2] < \text{pos}[1] \implies 1 + 1 = 2$ rounds.
- Test case $4$: `[1, 3, 2, 4]`. $pos[2] (2) < pos[1] (0)$ is false ($2 > 0$); $pos[3] (1) < pos[2] (2)$ is true (round 2); $pos[4] (3) < pos[3] (1)$ is false. Returns 2.

## Follow-ups
- What if there are $m$ dynamic swap queries where two elements are exchanged? (CSES Collecting Numbers II): Instead of recomputing in $O(n)$, examine only the local transitions for $u-1, u, u+1$ and $v-1, v, v+1$. Subtract their old contributions to `rounds`, swap, and re-add their new contributions in $O(1)$ time per query.
- What if the array contains duplicate numbers? If numbers are not unique, each value $x$ would pair with the earliest available instance of $x$ following the chosen instance of $x - 1$.

## Common mistakes
- Confusing array indices with values: Writing `arr[i] < arr[i - 1]` instead of `pos[x] < pos[x - 1]` checks if the array is sorted, rather than checking if values appear in order of position.
- Sizing `pos` as $n$ instead of $n + 1$: Since values are $1 \dots n$, accessing `pos[n]` would cause an out-of-bounds error if sized $n$.

## Further reading
- [Permutations and Inversions on Wikipedia](https://en.wikipedia.org/wiki/Inversion_(discrete_mathematics))
