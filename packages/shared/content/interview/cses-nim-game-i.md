---
id: cses-nim-game-i
pattern: cses-range-tree-math-string
difficulty: medium
optimal: "O(n) time, O(1) space where n is heaps.length"
brute: same
reviewed: false
---

## Clarify first
- What are the rules of each turn? A player picks any single non-empty heap and removes any positive number of sticks from it (from 1 stick up to the entire heap).
- What is the winning condition? Normal play convention: the player who takes the last stick wins the game (i.e. the player who cannot make a move loses).
- Can the number of heaps or sticks be 0? `heaps.length >= 1` and each `heaps[i] >= 1`.
- What should be returned? Return `"first"` if the first player has a winning strategy, or `"second"` if the second player wins under optimal play.

## Examples to say out loud
- Consider `heaps = [5]`:
  - The first player simply takes all 5 sticks from the single heap and wins on turn 1.
  - Return `"first"`.
- Consider `heaps = [1, 2, 3]`:
  - XOR sum: `1 ^ 2 ^ 3 = 0`.
  - This is a losing position (P-position). Whatever the first player takes, the second player can transition back to an XOR sum of 0.
  - Second player wins; return `"second"`.
- Consider `heaps = [1, 2, 4]`:
  - XOR sum: `1 ^ 2 ^ 4 = 7 != 0`.
  - First player wins; return `"first"`.

## Brute force
Using minimax / game theory search with memoization over all possible states would take exponential time in the sum of heap sizes. Since heap sizes can be up to `10^9` across `200000` heaps, state-space search will immediately run out of time and memory. The Sprague-Grundy theorem provides the exact mathematical characterization.

## The key observation
By Bouton's Theorem for impartial games under the normal play convention:
A Nim state is an N-position (next player to move wins) if and only if the bitwise XOR sum (Nim-sum) of all heap sizes is strictly non-zero:
`S = heaps[0] ^ heaps[1] ^ ... ^ heaps[n - 1] != 0`.
Conversely, if `S == 0`, the position is a P-position (previous player won / current player loses):
- From any state with `S != 0`, there exists at least one legal move to a state with `S == 0` (by finding a heap where the highest bit of `S` is set and reducing that heap's size to `heap ^ S < heap`).
- From any state with `S == 0`, every legal move leads to a state with `S != 0`.
Therefore, the first player wins if and only if the XOR sum is non-zero.

## Optimal approach
1. Initialize `xorSum = 0`.
2. Iterate through every heap size `x` in `heaps`:
   - Compute `xorSum ^= x`.
3. If `xorSum != 0`, return `"first"`.
4. Otherwise, return `"second"`.

Complexity:
- Time: `O(n)` time where `n = heaps.length`, requiring a single linear pass over the heaps.
- Space: `O(1)` auxiliary space.

## Code walkthrough
- `int xorSum = 0;` accumulates the bitwise XOR sum of all heap sizes.
- `for (int x : heaps) xorSum ^= x;` combines each heap size using the bitwise XOR operator.
- `return (xorSum != 0) ? "first" : "second";` decides the winner based on whether the initial game state is an N-position (`xorSum != 0`) or a P-position (`xorSum == 0`).

## Test it out loud
- Test two equal heaps `[1, 1]`: `1 ^ 1 = 0`. Any move by player 1 is mirrored by player 2. Returns `"second"`.
- Test three equal heaps `[1, 1, 1]`: `1 ^ 1 ^ 1 = 1 != 0`. Player 1 takes one whole heap, leaving `[1, 1]`. Returns `"first"`.
- Test `[3, 5, 6]`: `3 ^ 5 ^ 6 = (011_2 ^ 101_2 ^ 110_2) = 000_2 = 0`. Returns `"second"`.
- Test `[2, 5, 7]`: `2 ^ 5 = 7`, so `7 ^ 7 = 0`. Returns `"second"`.
- Test `[10, 20, 30]`: `10 ^ 20 = 01010_2 ^ 10100_2 = 11110_2 = 30`. `30 ^ 30 = 0`. Returns `"second"`.

## Follow-ups
- What if the game followed the misère play convention (player who takes the last stick loses)?
  - In Misère Nim, optimal play is identical to normal Nim as long as at least one heap has size `> 1`. When all remaining heaps have size 1, the winning condition flips (first player wins if the count of heaps of size 1 is even).
- What if a player can take at most `k` sticks from a heap?
  - The Grundy value of a heap of size `x` becomes `x mod (k + 1)`. The game is won if the XOR sum of `heaps[i] mod (k + 1)` is non-zero.

## Common mistakes
- Confusing normal play convention with misère convention.
- Attempting an arithmetic sum instead of bitwise XOR sum.
