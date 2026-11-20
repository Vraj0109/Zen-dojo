---
id: cses-tasks-and-deadlines
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n \log n) time and O(1) space"
reviewed: false
---

## Clarify first
- What are the inputs? An array of $n$ tasks, each given as `[duration, deadline]`.
- How are tasks executed? Tasks are executed one after another starting at time 0 without any idle gaps.
- What is the reward function? If task $i$ completes at time $f_i$, its reward is $\text{deadline}_i - f_i$.
- Can the reward be negative? Yes, finishing past the deadline incurs a negative reward.
- What is the objective? Maximize the total sum of rewards across all tasks.
- Can the result overflow 32 bits? Yes, with $n = 200000$ and deadlines/durations up to $10^9$, total reward can reach $\pm 2 \times 10^{14}$, requiring 64-bit integers (`long long`).

## Examples to say out loud
- Consider `tasks = [[6, 10], [8, 15], [5, 12]]`:
  - If we process tasks in order of duration: 5, then 6, then 8:
    - Task with dur 5 (deadline 12): finishes at 5. Reward = $12 - 5 = 7$.
    - Task with dur 6 (deadline 10): finishes at $5 + 6 = 11$. Reward = $10 - 11 = -1$.
    - Task with dur 8 (deadline 15): finishes at $11 + 8 = 19$. Reward = $15 - 19 = -4$.
    - Total reward = $7 + (-1) + (-4) = 2$.
  - This is the maximum possible reward.
- Edge case: single task `[[10, 5]]`:
  - Finishes at 10. Reward = $5 - 10 = -5$.

## Brute force
A brute force approach would test all $n!$ possible ordering permutations of the tasks and calculate the total reward for each. For $n = 200000$, testing $n!$ permutations is impossible. By analyzing the algebraic formula for total reward, greedy sorting solves the problem in $O(n \log n)$ time.

## The key observation
The total reward is the sum of rewards for all $n$ tasks:
$$\text{Total Reward} = \sum_{i=1}^n (\text{deadline}_i - f_i) = \sum_{i=1}^n \text{deadline}_i - \sum_{i=1}^n f_i$$
Notice that $\sum \text{deadline}_i$ is a fixed constant regardless of the processing order!
To maximize the total reward, we must **minimize** the sum of completion times $\sum f_i$.
If tasks are processed in order with durations $d_1, d_2, \dots, d_n$, then:
- $f_1 = d_1$
- $f_2 = d_1 + d_2$
- $f_3 = d_1 + d_2 + d_3$, and so on.
Summing all finish times:
$$\sum_{i=1}^n f_i = n \cdot d_1 + (n - 1) \cdot d_2 + (n - 2) \cdot d_3 + \dots + 1 \cdot d_n$$
By the Rearrangement Inequality, to minimize this sum, the largest coefficients ($n, n - 1, \dots$) must multiply the smallest durations. Therefore, tasks must be processed in **ascending order of duration** (Shortest Processing Time first). Deadlines have zero impact on the optimal ordering!

## Optimal approach
1. Sort `tasks` in ascending order of duration (`task[0]`).
2. Initialize 64-bit integer variables `current_time = 0` and `total_reward = 0`.
3. For each task in sorted order:
   - Add `task[0]` to `current_time`.
   - Add `task[1] - current_time` to `total_reward`.
4. Return `total_reward`.

Complexity:
- Time: $O(n \log n)$ to sort the array of $n$ tasks, followed by an $O(n)$ linear summation pass.
- Space: $O(1)$ auxiliary space beyond the sorting recursion stack.

## Code walkthrough
- `sort(tasks.begin(), tasks.end(), ...)`: Sorts tasks purely by `task[0] < task[0]`. Deadlines are deliberately ignored during sorting.
- `long long current_time = 0, total_reward = 0`: 64-bit variables to avoid numerical overflow.
- `current_time += task[0]`: Advances the timeline to this task's finish time.
- `total_reward += (task[1] - current_time)`: Adds the task's reward (deadline minus finish time).

## Test it out loud
- Test case $1$: `[[1, 10], [2, 10], [3, 10]]`. Durations already sorted $1, 2, 3$. Finish times: 1, 3, 6. Rewards: $9 + 7 + 4 = 20$.
- Test case $2$: `[[5, 20], [5, 10], [5, 15]]`. Durations are identical (5, 5, 5). Total reward is invariant to tie-breaking, returns 15.
- Test case $3$: `[[1000000000, 1000000000]]`. Finishes at $10^9$. Reward = $10^9 - 10^9 = 0$.
- Test case $4$: `[[4, 2], [3, 1], [5, 3], [1, 5]]`. Durations sorted: 1, 3, 4, 5. Finishes: 1, 4, 8, 13. Rewards: $4 - 3 - 6 - 10 = -15$.

## Follow-ups
- What if tasks had release dates (arrival times)? The problem becomes NP-hard ($1 | r_j | \sum C_j$).
- What if reward had a hard cutoff (0 reward if late)? This becomes the classic Moore-Hodgson algorithm, maximizing the count of on-time tasks using an Earliest Due Date sort with a max-heap to drop long late tasks.

## Common mistakes
- Sorting by deadline instead of duration: Intuition often suggests doing urgent tasks first (Earliest Deadline First). However, algebraically, deadlines sum to a constant, so only task duration affects the final total.
- 32-bit integer overflow: Durations and deadlines up to $10^9$ cause $\sum f_i$ to reach $10^{14}$, overflowing signed 32-bit integers.

## Further reading
- [Shortest Processing Time First on Wikipedia](https://en.wikipedia.org/wiki/Shortest_job_next)
