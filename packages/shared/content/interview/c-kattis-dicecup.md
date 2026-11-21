---
id: c-kattis-dicecup
pattern: cses-kattis
difficulty: easy
optimal: "O(n + m) time and O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What are the inputs? Two integers `N` and `M` representing the number of faces on two standard dice (one with faces 1 to `N`, the other with faces 1 to `M`).
- What are the outcomes? When rolling both dice, the sum of their faces ranges from `1 + 1 = 2` to `N + M`. Each face on each die is equally likely (probability `1/N` and `1/M`).
- What is the goal? Find the most likely sum(s) of the two dice. If there are multiple sums with the highest probability, list all of them in ascending order.
- What are the constraints? `4 <= N, M <= 20`.

## Examples to say out loud
- Consider `N = 6, M = 6`:
  - The sum distribution has a single peak at `6 + 1 = 7`.
  - Output is 7.
- Consider `N = 6, M = 4`:
  - Smallest die has 4 faces, larger has 6 faces.
  - The sums with maximal frequency form a plateau from `min(N, M) + 1` to `max(N, M) + 1`:
    - `4 + 1 = 5` up to `6 + 1 = 7`.
    - Outputs are 5, 6, 7.

## Brute force
We can simulate all pairs `(i, j)` where `1 <= i <= N` and `1 <= j <= M`, count the frequencies of each sum `i + j` in a frequency array of size `N + M + 1`, find the maximum frequency, and print all sums that achieve that maximum frequency. Since `N, M <= 20`, there are at most 400 pairs, which takes negligible time.

## The key observation
The sum of two uniform discrete distributions on `[1, N]` and `[1, M]` forms a trapezoidal distribution.
If we let `A = min(N, M)` and `B = max(N, M)`:
- Sums from 2 to `A` have strictly increasing probabilities.
- Sums from `A + 1` up to `B + 1` all achieve the maximum possible probability (each has exactly `A` combinations).
- Sums from `B + 2` to `A + B` have strictly decreasing probabilities.
Therefore, the most likely outcomes are all integers in the range `[min(N, M) + 1, max(N, M) + 1]`.

## Optimal approach
1. Read `N` and `M`.
2. Determine `low = min(N, M) + 1` and `high = max(N, M) + 1`.
3. Loop integer `s` from `low` to `high`:
   - Print `s` on a new line.

Complexity:
- Time complexity: O(max(N, M) - min(N, M) + 1) = O(|N - M|), which is at most 17 operations, effectively O(1).
- Space complexity: O(1) auxiliary space.

## Code walkthrough
- `int low = min(N, M) + 1`: The beginning of the maximum probability plateau.
- `int high = max(N, M) + 1`: The end of the maximum probability plateau.
- `for (int s = low; s <= high; s++) cout << s << "\n"`: Emits all tied maximal sum values in ascending order.

## Test it out loud
- `N = 6, M = 6`: `low = 7, high = 7` -> prints `7`. Correct.
- `N = 6, M = 4`: `min = 4, max = 6`. Range is `[5, 7]` -> prints `5, 6, 7`. Correct.
- `N = 12, M = 20`: `min = 12, max = 20`. Range is `[13, 21]` -> prints `13` through `21`. Correct.

## Follow-ups
- What if the dice had weights (non-uniform probabilities)? The mathematical plateau no longer holds directly; we would compute the convolution of the two probability vectors in O(N * M) or O((N + M) log(N + M)) via FFT and find the argmax.

## Common mistakes
- Printing only the single average `(N + M + 2) / 2` when `N != M`, missing the other equally likely sums in the plateau.
- Sorting or building hash maps when simple min/max bounds give the exact range.
