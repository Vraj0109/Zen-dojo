---
id: c-kattis-trik
pattern: cses-kattis
difficulty: easy
optimal: "O(n) time and O(1) space"
reviewed: false
---

## Clarify first
- What does the game consist of? Three opaque cups placed in a row on a table, initially in positions 1 (left), 2 (middle), and 3 (right).
- Where is the ball initially? The ball starts under cup 1 (leftmost cup).
- What are the swap operations?
  - Move 'A': swaps cup 1 and cup 2.
  - Move 'B': swaps cup 2 and cup 3.
  - Move 'C': swaps cup 1 and cup 3.
- What is the input? A single string of uppercase characters 'A', 'B', 'C' representing the sequence of swaps performed.
- What should be output? The 1-based index (1, 2, or 3) of the cup under which the ball is located after all moves.
- What are the constraints? String length is at most 50 characters.

## Examples to say out loud
- Consider moves `"AB"`:
  - Ball starts at position 1.
  - Move 'A': swaps 1 and 2 -> ball moves from 1 to 2.
  - Move 'B': swaps 2 and 3 -> ball moves from 2 to 3.
  - Final position is 3.
- Consider moves `"CBABCACCC"`:
  - Start at 1.
  - 'C' swaps 1 and 3 -> at 3.
  - 'B' swaps 2 and 3 -> at 2.
  - And so on until final position is reached.

## Brute force
We could represent the three cups as an array of three booleans or integers `[1, 0, 0]` and simulate the swaps. However, since there is only one ball, tracking the ball's single position (an integer `pos`) is even simpler and executes in O(n) time.

## The key observation
We only need to track the current position `pos` of the ball:
- On move 'A': if `pos == 1`, set `pos = 2`; else if `pos == 2`, set `pos = 1`.
- On move 'B': if `pos == 2`, set `pos = 3`; else if `pos == 3`, set `pos = 2`.
- On move 'C': if `pos == 1`, set `pos = 3`; else if `pos == 3`, set `pos = 1`.
If `pos` is not involved in the swap, it remains unchanged.

## Optimal approach
1. Initialize `pos = 1`.
2. For each character `move` in the string:
   - If `move == 'A'`: if `pos == 1` pos becomes 2; else if `pos == 2` pos becomes 1.
   - If `move == 'B'`: if `pos == 2` pos becomes 3; else if `pos == 3` pos becomes 2.
   - If `move == 'C'`: if `pos == 1` pos becomes 3; else if `pos == 3` pos becomes 1.
3. Print `pos`.

Complexity:
- Time complexity: O(n) where `n <= 50` is the number of swaps. Each move is handled in O(1) time.
- Space complexity: O(1) auxiliary space to store the position integer.

## Code walkthrough
- `int pos = 1`: Ball starts under the first cup.
- `for (char c : s)`: Processes each swap sequentially.
- `if (c == 'A') { if (pos == 1) pos = 2; else if (pos == 2) pos = 1; }`: Handles swap of cups 1 and 2.
- `else if (c == 'B') { if (pos == 2) pos = 3; else if (pos == 3) pos = 2; }`: Handles swap of cups 2 and 3.
- `else if (c == 'C') { if (pos == 1) pos = 3; else if (pos == 3) pos = 1; }`: Handles swap of cups 1 and 3.
- `cout << pos << "\n"`: Prints final cup position.

## Test it out loud
- `"AB"`: `pos = 1 -> 2 -> 3`. Result is 3. Correct.
- `"A"`: `pos = 1 -> 2`. Result is 2. Correct.
- `""`: `pos = 1`. Result is 1. Correct.

## Follow-ups
- How to represent the swaps using permutation matrices? Each move can be viewed as a 3x3 permutation matrix; composing multiple moves corresponds to matrix multiplication.

## Common mistakes
- Using consecutive `if` statements instead of `if / else if`:
  `if (pos == 1) pos = 2; if (pos == 2) pos = 1;` will incorrectly immediately swap `pos` back to 1.
