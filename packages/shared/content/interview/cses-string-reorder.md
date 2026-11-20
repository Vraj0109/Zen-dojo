---
id: cses-string-reorder
pattern: cses-introductory
difficulty: medium
optimal: "O(\Sigma \times n) time and O(\Sigma) space, where \Sigma = 26"
reviewed: false
---

## Clarify first
- What is the constraint on adjacent characters? No two adjacent characters in the reordered string may be identical.
- What should be returned if no valid rearrangement exists? Return "-1".
- How are ties broken when multiple valid rearrangements exist? Return the alphabetically (lexicographically) smallest one.
- What are the constraints on the input string? $1 \le |s| \le 10^6$, containing only uppercase English letters 'A' through 'Z'.

## Examples to say out loud
- Consider $s = \text{"AAB"}$:
  - Length $n = 3$. Counts: A: 2, B: 1.
  - Position 0: Can we pick 'A'? If we pick 'A', remaining counts are A: 1, B: 1. Max frequency in remaining is 1. Since $1 \le \lfloor (2 + 1) / 2 \rfloor = 1$, picking 'A' is valid.
  - Position 1: Cannot pick 'A' because previous character is 'A'. Try 'B': valid.
  - Position 2: 'A'.
  - Result: "ABA".
- Consider $s = \text{"AAAB"}$:
  - Length $n = 4$. Counts: A: 3, B: 1.
  - The maximum frequency 3 exceeds $\lfloor (4 + 1) / 2 \rfloor = 2$.
  - Impossible to avoid adjacent 'A's. Return "-1".

## Brute force
A brute-force solution would generate all unique permutations of the string and search for the first valid one in alphabetical order. Because $|s| \le 10^6$, permutation generation is completely impossible. We can construct the solution greedily character by character.

## The key observation
For a multiset of letters of total remaining length $R$ to be arrangeable without adjacent duplicates, the most frequent character must appear at most $\lfloor (R + 1) / 2 \rfloor$ times. Furthermore, if the character placed at the previous position has count $c_{\text{last}}$ in the remaining multiset, it cannot be placed immediately, so it must satisfy $c_{\text{last}} \le \lfloor R / 2 \rfloor$.
Because we want the lexicographically smallest result, we construct the string greedily from left to right: at each position, we iterate through candidate characters from 'A' to 'Z', skip any character equal to the previous character, tentatively decrement its count, and test whether the remaining multiset remains feasible. The first character that preserves feasibility is locked in.

## Optimal approach
1. Count the frequencies of all 26 characters in an array `cnt`.
2. Check initial feasibility: if $\max(\text{cnt}) > \lfloor (n + 1) / 2 \rfloor$, return "-1".
3. Initialize an empty string `out` and set `last = -1`.
4. For each position from $0$ to $n - 1$:
   - For character $c$ from 0 ('A') to 25 ('Z'):
     - If $\text{cnt}[c] == 0$ or $c == \text{last}$, continue.
     - Temporarily decrement $\text{cnt}[c]$.
     - Check if remaining counts are valid:
       - $\max_{i}(\text{cnt}[i]) \le \lfloor (\text{rem} + 1) / 2 \rfloor$, where $\text{rem} = n - \text{pos} - 1$.
       - $\text{cnt}[c] \le \lfloor \text{rem} / 2 \rfloor$.
     - If valid: append `char('A' + c)` to `out`, update `last = c`, and break.
     - Otherwise, restore $\text{cnt}[c]++$.
5. Return `out`.

Complexity:
- Time: $O(\Sigma^2 \times n)$ where $\Sigma = 26$. For $n = 10^6$, $\Sigma^2 = 676$, leading to around $10^7$ operations in practice because we break on the first valid character.
- Space: $O(\Sigma)$ auxiliary space beyond the output string.

## Code walkthrough
- `bool ok(const int* cnt, int rem, int last)`: Validates feasibility of the remaining multiset. Checks that no character exceeds $\lfloor (\text{rem} + 1) / 2 \rfloor$ and the character just placed does not exceed $\lfloor \text{rem} / 2 \rfloor$.
- `if (!ok(cnt, n, -1)) return "-1"`: Early exit if the original multiset is impossible to rearrange.
- `for (int c = 0; c < 26; c++)`: Tries characters in ascending alphabetical order to guarantee the lexicographically earliest choice.
- `if (ok(cnt, n - pos - 1, c)) { out += char('A' + c); last = c; break; }`: Commits to the smallest valid character and advances to the next position.

## Test it out loud
- Test case $1$: $s = \text{"A"}$. Initial check passes. Picks 'A'. Returns "A".
- Test case $2$: $s = \text{"AA"}$. Initial count of 'A' is 2, $(2 + 1)/2 = 1 < 2$. Returns "-1".
- Test case $3$: $s = \text{"AB"}$. Picks 'A', then 'B'. Returns "AB".
- Test case $4$: $s = \text{"AABB"}$. Pos 0: tries 'A' (remains 1 'A', 2 'B's in rem 3; max is 2 $\le (3+1)/2=2$, valid). Pos 1: tries 'A' (same as last, skipped), tries 'B' (valid). Pos 2: tries 'A'. Pos 3: 'B'. Returns "ABAB".

## Follow-ups
- How to optimize checking feasibility from $O(\Sigma)$ to $O(1)$? Maintain the max frequency dynamically with a max-heap or frequency bucket array, reducing overall complexity to $O(\Sigma \times n)$.
- What if the alphabet is arbitrary (e.g. integers up to $10^9$)? Use a map or priority queue to manage counts and find the minimum valid key.

## Common mistakes
- Forgetting the condition on `cnt[last]`: If the remaining count of the letter just placed is exactly $\lfloor (R + 1) / 2 \rfloor$ when $R$ is odd, that letter would have to occupy the first position of the remaining suffix, causing an immediate adjacent duplicate. It must satisfy $\le \lfloor R / 2 \rfloor$.
- Using a priority queue picking the highest frequency: A standard max-heap greedy produces a valid string, but fails the requirement to find the lexicographically smallest arrangement.

## Further reading
- [Rearranging Characters and Majority Elements on Wikipedia](https://en.wikipedia.org/wiki/Boyer%E2%80%93Moore_majority_vote_algorithm)
