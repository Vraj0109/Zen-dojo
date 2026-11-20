---
id: c-cf-158a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) space"
reviewed: false
---

## Clarify first

- How are the scores sorted? (Scores are given in non-increasing order: $a[0] \ge a[1] \ge \dots \ge a[n - 1]$).
- What is the promotion threshold? (A participant advances if their score is strictly greater than 0 AND their score is greater than or equal to the score of the participant in $k$-th place).
- Is $k$ 1-indexed or 0-indexed in the problem description? ($k$ is 1-indexed in problem text, corresponding to index $k - 1$ in zero-based arrays).
- What are the constraints on $n$, $k$, and scores? ($1 \le k \le n \le 100$, and each score $0 \le a[i] \le 100$).
- What should be returned? (The total count of participants who advance to the next round).

## Examples to say out loud

- Standard case: `n = 8, k = 5, a = [10, 9, 8, 7, 7, 7, 5, 5]`.
  - The 5th place participant has score $a[4] = 7$.
  - All participants with score $\ge 7$ and score $> 0$ advance: indices 0 through 5 (scores 10, 9, 8, 7, 7, 7).
  - Total promoted: 6 participants.
- Zero score threshold: `n = 4, k = 2, a = [0, 0, 0, 0]`.
  - The 2nd place participant has score 0.
  - However, only participants with a strictly positive score can be promoted. No score $> 0$ exists. Output is 0.
- Mixed zeros: `n = 5, k = 3, a = [10, 5, 0, 0, 0]`.
  - The 3rd place participant has score 0.
  - Participants with score $> 0$ are the first two (10 and 5). Total promoted: 2.

## Brute force

A direct simulation identifies the threshold score $T = a[k - 1]$. It then iterates through all $n$ participants from index 0 to $n - 1$, checking whether $a[i] \ge T$ and $a[i] > 0$. Since $n \le 100$, iterating through the array once runs in $O(n)$ time and $O(1)$ space, performing at most 100 checks.

## The key observation

Because the array is already sorted in non-increasing order, all participants who qualify must form a contiguous prefix starting at index 0. Let $T = a[k - 1]$ be the score of the $k$-th participant. If $T > 0$, every participant up to index $k - 1$ automatically qualifies, plus any subsequent participants whose score equals $T$. If $T == 0$, only participants strictly before index $k - 1$ with score $> 0$ qualify. In either case, an element qualifies if and only if $a[i] \ge a[k - 1]$ and $a[i] > 0$.

## Optimal approach

1. Identify the score of the $k$-th participant: `target = a[k - 1]`.
2. Initialize a counter `count = 0`.
3. Loop through each score `x` in array `a`:
   - If `x >= target` and `x > 0`, increment `count`.
   - (Optional early break): since the array is non-increasing, break early as soon as an element fails the condition.
4. Return `count`.

Complexity:
- Time: `O(n)` because we iterate through the array of length $n \le 100$ once.
- Space: `O(1)` auxiliary space as no additional memory is allocated.

## Code walkthrough

In the reference implementation:
- `int threshold = a[k - 1];`: accesses the benchmark score at 0-based index `k - 1`.
- `int count = 0;`: tracks the number of qualifying participants.
- `for (int x : a) if (x >= threshold && x > 0) count++;`: verifies both that the participant meets the $k$-th score and that their score is strictly positive.
- `return count;`: returns the count of advancing participants.

## Test it out loud

- `n = 8, k = 5, a = [10, 9, 8, 7, 7, 7, 5, 5]`:
  - `threshold = a[4] = 7`.
  - Elements $\ge 7$ and $> 0$: 10, 9, 8, 7, 7, 7 (6 elements). Returns 6.
- `n = 4, k = 2, a = [0, 0, 0, 0]`:
  - `threshold = 0`.
  - Condition `x > 0` fails for all elements. Returns 0.
- `n = 1, k = 1, a = [1]`:
  - `threshold = 1`. 1 qualifies. Returns 1.

## Follow-ups

- Can we solve this in $O(\log n)$ using binary search?
  Yes, because the array is sorted. If $a[k - 1] > 0$, we find the last occurrence of values $\ge a[k - 1]$ using binary search in $O(\log n)$. If $a[k - 1] == 0$, we binary search for the last strictly positive value in $O(\log n)$.
- What if the array was not sorted initially?
  We would use Quickselect (`std::nth_element`) to find the $k$-th largest element in expected $O(n)$ time, then do a single linear pass.

## Common mistakes

- Forgetting the condition that score must be strictly positive (`x > 0`), promoting players with score 0 when the $k$-th player has score 0.
- 0-based indexing confusion: using `a[k]` instead of `a[k - 1]`.
- Assuming exactly $k$ participants are always promoted, neglecting ties that extend past $k$.

## Further reading

- Binary search for threshold boundaries on monotonic sequences.
- Quickselect and Order Statistics for unsorted arrays.
