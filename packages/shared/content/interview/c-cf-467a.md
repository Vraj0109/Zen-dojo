---
id: c-cf-467a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time and O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What are the inputs? An integer `n` denoting the number of dorm rooms, followed by `n` pairs of integers `(p_i, q_i)` representing the number of people already living in room `i` and the room's total capacity.
- What are George and Alex looking for? They want to move into the same room together, meaning the room must have at least 2 free beds available.
- What should the function return? The count of rooms that have at least 2 free spaces (`q_i - p_i >= 2`).
- What are the constraints? `n` is between 1 and 100, and `0 <= p_i <= q_i <= 100`.

## Examples to say out loud
- Consider `n = 3` with rooms:
  - Room 1: `(1, 1)` -> Free capacity: `1 - 1 = 0` (less than 2, cannot move in).
  - Room 2: `(2, 2)` -> Free capacity: `2 - 2 = 0` (less than 2, cannot move in).
  - Room 3: `(3, 5)` -> Free capacity: `5 - 3 = 2` (at least 2, can move in).
  - Total valid rooms = 1.
- Edge case: A room with `p = 0, q = 2`. Free capacity is 2, valid.
- Another case: All rooms full `(q - p < 2)`. Total valid rooms = 0.

## Brute force
A single pass iterating through the list of rooms is already minimal since we must inspect each room at least once to know its capacity and occupancy. There is no simpler sub-problem; doing anything slower (like storing redundant lists) is unnecessary.

## The key observation
For any room `i`, George and Alex need 2 spaces simultaneously. Thus, a room is suitable if and only if `q_i - p_i >= 2`. We just keep a running counter initialized to 0 and increment it whenever this condition holds.

## Optimal approach
1. Initialize `count = 0`.
2. Iterate through each room `(p_i, q_i)` in the given list of rooms.
3. Check if `q_i - p_i >= 2`.
4. If true, increment `count` by 1.
5. After checking all `n` rooms, return `count`.

Complexity:
- Time complexity: O(n), where `n` is the number of rooms, because each room is inspected in O(1) operations.
- Space complexity: O(1) auxiliary space, as only a single integer accumulator is maintained.

## Code walkthrough
- `int count = 0`: Accumulator for available matching rooms.
- `for (const auto& [p, q] : rooms)`: Iterates through each room tuple.
- `if (q - p >= 2) count++`: Tests whether there are at least two vacant beds.
- `return count`: Returns final tally.

## Test it out loud
- `n = 3`, pairs: `[1, 1], [2, 2], [3, 5]`: Room differences are `0, 0, 2`. Count becomes 1. Correct.
- `n = 3`, pairs: `[1, 10], [0, 10], [10, 10]`: Differences are `9, 10, 0`. Count becomes 2. Correct.
- `n = 1`, pair: `[2, 3]`: Difference is `1 < 2`. Count is 0. Correct.

## Follow-ups
- What if there are `k` friends wanting to move into the same room? We replace the constant 2 with parameter `k`, checking `q_i - p_i >= k`.
- What if rooms can accommodate people separately? Then we sum `max(0, q_i - p_i)` across all rooms and check if total capacity >= `k`.

## Common mistakes
- Checking `q_i - p_i > 2` instead of `>= 2` (they only need exactly 2 spots).
- Swapping `p` and `q` when calculating free capacity.
