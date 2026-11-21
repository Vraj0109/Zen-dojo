---
id: c-cf-703a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- How is the game played? Mishka and Chris play a match consisting of $n$ rounds.
- What happens in each round? In round $i$, Mishka rolls a die showing $m_i$ and Chris rolls a die showing $c_i$ ($1 \le m_i, c_i \le 6$).
  - If $m_i > c_i$, Mishka wins the round.
  - If $c_i > m_i$, Chris wins the round.
  - If $m_i == c_i$, the round is a draw and neither player gets a round win.
- How is the match winner decided?
  - If Mishka won more rounds overall, return `"Mishka"`.
  - If Chris won more rounds overall, return `"Chris"`.
  - If both players won the exact same number of rounds, return `"Friendship is magic!^^"`.
- What are the constraints? The number of rounds $n$ is between 1 and 100.

## Examples to say out loud
- Consider `rounds = [[3, 5], [2, 1], [4, 2]]`.
  - Round 1: Mishka = 3, Chris = 5 $\to$ Chris wins (Chris = 1, Mishka = 0).
  - Round 2: Mishka = 2, Chris = 1 $\to$ Mishka wins (Chris = 1, Mishka = 1).
  - Round 3: Mishka = 4, Chris = 2 $\to$ Mishka wins (Chris = 1, Mishka = 2).
  Mishka has 2 wins, Chris has 1 win.
  Result: `"Mishka"`.
- Consider `rounds = [[6, 1], [1, 6], [3, 3]]`.
  - Round 1: Mishka wins.
  - Round 2: Chris wins.
  - Round 3: Draw ($3 == 3$).
  Equal wins (1 vs 1) $\to$ return `"Friendship is magic!^^"`.
- Consider `rounds = [[1, 1]]` $\to$ draw $\to$ return `"Friendship is magic!^^"`.

## Brute force
Because every round must be evaluated to tally each player's round wins, any correct solution must read the $n$ pairs. Simulating round by round takes $O(n)$ time and $O(1)$ memory, which is already minimal and optimal.

## The key observation
We maintain two counters: `mWins = 0` for Mishka and `cWins = 0` for Chris.
For each round $[m, c]$:
- If $m > c$, increment `mWins++`.
- If $c > m$, increment `cWins++`.
- If $m == c$, do nothing.
At the end of all rounds:
- If `mWins > cWins`, return `"Mishka"`.
- If `cWins > mWins`, return `"Chris"`.
- Otherwise, return `"Friendship is magic!^^"`.

## Optimal approach
1. Initialize `mWins = 0` and `cWins = 0`.
2. Iterate through each 2-element round $r$ in `rounds`:
   - If $r[0] > r[1]$, increment `mWins++`.
   - Else if $r[1] > r[0]$, increment `cWins++`.
3. If `mWins > cWins`, return `"Mishka"`.
4. If `cWins > mWins`, return `"Chris"`.
5. Return `"Friendship is magic!^^"`.
6. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the number of rounds (at most 100).
   - Space Complexity: $O(1)$, using only two integer accumulators.

## Code walkthrough
- `int mWins = 0, cWins = 0;`: Track total rounds won by each player.
- `for (const auto& r : rounds)`: Loop through dice pairs.
- `if (r[0] > r[1]) mWins++; else if (r[1] > r[0]) cWins++;`: Award 1 point to the player with the higher roll, ignoring ties.
- `if (mWins > cWins) return "Mishka";`: Compare final scores and return winner string.
- `return "Friendship is magic!^^";`: Tie outcome string.

## Test it out loud
- Test 1: `[[2, 4], [3, 5]]` $\to$ Chris wins both $\to$ `"Chris"`.
- Test 2: `[[1, 1]]` $\to 0$ vs $0 \to$ `"Friendship is magic!^^"`.
- Test 3: `[[5, 2]]` $\to$ Mishka wins $\to$ `"Mishka"`.
- Test 4: `[[1, 6]]` $\to$ Chris wins $\to$ `"Chris"`.
- Test 5: `[[6, 6], [2, 1], [1, 2]]` $\to 1$ win each, 1 draw $\to$ `"Friendship is magic!^^"`.

## Follow-ups
- How to implement with a single differential counter?
  Initialize `diff = 0`. For each round: `if (r[0] > r[1]) diff++; else if (r[1] > r[0]) diff--;`.
  Return `"Mishka"` if $\text{diff} > 0$, `"Chris"` if $\text{diff} < 0$, and `"Friendship is magic!^^"` if $\text{diff} == 0$.
- What if dice values summed across all rounds determined the winner?
  Accumulate $\sum m_i$ and $\sum c_i$ and compare the sums.

## Common mistakes
- Misspelling the tie string `"Friendship is magic!^^"` (e.g. omitting the exclamation mark or carets).
- Adding dice values together instead of counting rounds won.
- Incrementing a counter during a draw ($r[0] == r[1]$).
