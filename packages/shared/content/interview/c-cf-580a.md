---
id: c-cf-580a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) space"
reviewed: false
---

## Clarify first

- What is a non-decreasing subsegment? (A contiguous sequence of elements within the array where each element is greater than or equal to the immediately preceding element: $a[i] \ge a[i - 1]$ for all consecutive elements in the segment).
- Does the subsegment have to be strictly increasing? (No, non-decreasing allows consecutive elements to be equal).
- Can the elements be non-contiguous? (No, the problem specifies a contiguous block / subsegment of days, not a general subsequence).
- What are the constraints on array length and earnings? (`1 <= a.length <= 100000`, and each element $1 \le a[i] \le 10^9$).
- What should be returned? (The maximum length among all contiguous non-decreasing subsegments).

## Examples to say out loud

- Standard case: `a = [2, 2, 1, 3, 4, 1]`.
  - Subsegments: `[2, 2]` (length 2), `[1, 3, 4]` (length 3), `[1]` (length 1).
  - Longest length is 3. Output is 3.
- All non-decreasing: `a = [2, 2, 9]`. The entire array is non-decreasing. Length is 3. Output is 3.
- Strictly decreasing: `a = [5, 4, 3, 2, 1]`. Each element breaks the sequence, so every non-decreasing block has length 1. Output is 1.
- Single element: `a = [1]`. Length is 1. Output is 1.

## Brute force

A brute-force strategy checks every pair of start and end indices $(i, j)$ with $0 \le i \le j < n$. For each pair, it verifies whether the subarray $a[i \dots j]$ is non-decreasing by checking $a[k] \ge a[k - 1]$ for all $k \in [i + 1, j]$. There are $O(n^2)$ subarrays, each taking up to $O(n)$ time to verify, yielding $O(n^3)$ overall time. For $n = 100,000$, $n^3 = 10^{15}$ operations, which times out by several orders of magnitude.

## The key observation

The condition $a[i] \ge a[i - 1]$ is purely local. If $a[i] \ge a[i - 1]$, the current non-decreasing run can be extended by 1 element: $\text{run} = \text{run} + 1$. If $a[i] < a[i - 1]$, the previous contiguous segment is broken, and a brand new contiguous segment starts at index $i$ with $\text{run} = 1$. Because we only ever need the current run length and the running maximum, a single linear scan computes the answer in $O(n)$ time and $O(1)$ space.

## Optimal approach

1. If the array has length 1, return 1 immediately.
2. Initialize `best = 1` and `run = 1`.
3. Iterate `i` from index 1 to $n - 1$:
   a. If `a[i] >= a[i - 1]`:
      - Increment `run++`.
   b. Otherwise:
      - Reset `run = 1`.
   c. Update `best = max(best, run)`.
4. Return `best`.

Complexity:
- Time: `O(n)` where $n$ is the length of `a`. We make a single forward pass examining each element once. For $n = 100,000$, this executes in about 2 ms.
- Space: `O(1)` auxiliary space as only two scalar integer variables (`best` and `run`) are allocated.

## Code walkthrough

In the reference implementation:
- `int best = 1, run = 1;`: starts with base length 1 since any single element forms a trivial non-decreasing run of length 1.
- `for (size_t i = 1; i < a.size(); i++)`: traverses from the second element through the end of the array.
- `run = a[i] >= a[i - 1] ? run + 1 : 1;`: extends the current contiguous run if monotonicity holds; otherwise resets to a new run of length 1.
- `best = max(best, run);`: records the maximum run length encountered so far.
- `return best;`: returns the overall maximum length.

## Test it out loud

- `a = [1]`:
  - Loop does not run. Returns `best = 1`.
- `a = [1, 2, 3, 4, 5]`:
  - `run` increments on each step: 1 $\to$ 2 $\to$ 3 $\to$ 4 $\to$ 5.
  - Returns 5.
- `a = [3, 3, 3, 3]`:
  - Since $3 \ge 3$ holds, `run` increments on each step.
  - Returns 4.
- `a = [1, 2, 1, 2, 1, 2]`:
  - Consecutive pairs alternate: increases then resets. Max run is 2. Returns 2.

## Follow-ups

- What if we need the actual start and end indices of the longest non-decreasing subsegment?
  Track `best_end` whenever `run > best`. The starting index is `best_end - best + 1`.
- What if we want the longest non-decreasing subsequence (non-contiguous)?
  This is the classic Longest Increasing/Non-Decreasing Subsequence (LIS) problem, solvable in $O(n \log n)$ time using patience sorting and binary search (`std::upper_bound`).

## Common mistakes

- Confusing a contiguous subsegment (subarray) with a subsequence, mistakenly attempting to solve LIS with dynamic programming or binary search.
- Using strict inequality `a[i] > a[i - 1]` instead of `a[i] >= a[i - 1]`, resetting on equal adjacent numbers.
- Resetting `run = 0` instead of `run = 1` when the sequence decreases, failing to count element $a[i]$ as the first element of the new run.

## Further reading

- Kadane's algorithm and single-pass contiguous subarray techniques.
- Longest Increasing Subsequence ($O(n \log n)$ patience sorting).
