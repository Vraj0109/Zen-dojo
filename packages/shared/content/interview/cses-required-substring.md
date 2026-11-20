---
id: cses-required-substring
pattern: cses-misc
difficulty: medium
optimal: "O(n * m * 26) time and O(m) space"
reviewed: false
---

## Clarify first
- What are the inputs? An integer `n` denoting the target string length, and a string `pattern` of length `m` (`m <= n`).
- What alphabet is used? Uppercase English letters `'A'` through `'Z'` (alphabet size 26).
- What should be counted? The number of strings of length `n` that contain `pattern` as a substring.
- What modulo should be applied? Modulo `10^9 + 7`.
- What are the constraints? `1 <= n <= 1000`, `1 <= m <= 100`, `m <= n`.

## Examples to say out loud
- Consider `n = 2` and `pattern = "A"`:
  - Total uppercase strings of length 2: `26^2 = 676`.
  - Strings of length 2 that contain no `'A'`: `25^2 = 625`.
  - Strings containing at least one `'A'`: `676 - 625 = 51`. Output: 51.
- Consider `n = 2` and `pattern = "AB"`:
  - Only one string of length 2 matches `"AB"`, which is `"AB"`. Output: 1.
- Consider `n = 3` and `pattern = "AB"`:
  - `"AB_"` yields 26 strings.
  - `"_AB"` yields 26 strings.
  - Intersection is empty because `"AB"` cannot overlap with itself at offset 1.
  - Total = `26 + 26 = 52`. Output: 52.

## Brute force
Generating all `26^n` strings and checking if `pattern` is a substring takes exponential time O(26^n * n), which is astronomical for `n = 1000`. Direct inclusion-exclusion over all possible pattern placement positions is also intractable because overlapping patterns create complex dependency graphs. We need Dynamic Programming over a Deterministic Finite Automaton (DFA).

## The key observation
Instead of directly counting strings that contain the pattern, it is much easier to count the complement: strings of length `n` that **DO NOT** contain `pattern` as a substring!
Then, the answer is simply:
`Total strings (26^n) - Strings avoiding pattern`.
To track partial pattern matches, we build a KMP state machine. The states correspond to the length of the longest prefix of `pattern` matched so far (`0 <= state < m`). State `m` would mean the pattern has appeared, so it is an absorbing "forbidden" state that we never enter.
For each state `j` (`0 <= j < m`) and each letter `c` in `'A'...'Z'`, the next state is determined by KMP transitions.
`dp[i][j]` is the number of strings of length `i` whose longest matched prefix of `pattern` ends in state `j`.

## Optimal approach
1. Set `MOD = 10^9 + 7`.
2. Compute KMP failure function `pi` for `pattern`.
3. Precompute transitions `nxt[state][char]`:
   - For `j` from 0 to `m - 1` and `c` from 0 to 25:
     - Find the next match state using standard KMP backtracking.
4. Initialize DP: `dp[0] = 1`, all other `dp[j] = 0` for `j > 0`.
5. For step 1 to `n`:
   - Create `next_dp` array of size `m` initialized to 0.
   - For `j` from 0 to `m - 1`:
     - If `dp[j] == 0`, continue.
     - For each character `c` from 0 to 25:
       - Let `nj = nxt[j][c]`.
       - If `nj < m` (the forbidden state `m` is NOT reached):
         - `next_dp[nj] = (next_dp[nj] + dp[j]) % MOD`.
   - `dp = next_dp`.
6. Compute sum of avoiding strings: `avoid = sum(dp[j]) % MOD` for all `0 <= j < m`.
7. Compute total strings: `total = 26^n % MOD`.
8. Return `(total - avoid + MOD) % MOD`.

Complexity:
- Time complexity: O(m * 26 + n * m * 26). With `n = 1000, m = 100`, total operations are `1000 * 100 * 26 = 2.6 * 10^6`, running in ~15 ms.
- Space complexity: O(m * 26) to store transitions, and O(m) space for the DP array using two alternating rows.

## Code walkthrough
- `vector<vector<int>> nxt(m, vector<int>(26))`: Precomputes KMP state transitions so inner DP does zero string work.
- `if (nj < m)`: Prevents entering state `m`, enforcing that the forbidden pattern never completes.
- `next_dp[nj] = (next_dp[nj] + dp[j]) % MOD`: Transitions valid avoiding prefixes.
- `total = power(26, n, MOD)`: Evaluates total unconstrained strings of length `n`.
- `return (total - avoid + MOD) % MOD`: Returns the count of strings containing the pattern.

## Test it out loud
- `n = 2, pattern = "A"`: `m = 1`. State 0 has 25 transitions to state 0 (letters other than 'A'), and transition on 'A' leads to state 1 (forbidden). After 2 steps: `dp[0] = 25^2 = 625`. Total is `26^2 = 676`. `676 - 625 = 51`. Correct.
- `n = 2, pattern = "AB"`: Total = 676. Avoiding is 675. Result: 1. Correct.

## Follow-ups
- How to extend this if there are multiple forbidden patterns? Use an **Aho-Corasick automaton** instead of KMP to construct the multi-pattern trie and transition table. The rest of the DP remains identical.

## Common mistakes
- Counting strings with the pattern directly with state `m` as an absorbing state, which is valid but requires careful transition handling (transitioning from state `m` to itself with 26 edges); complement counting is cleaner and less error-prone.
- Forgetting to add `MOD` before taking `% MOD` when subtracting `(total - avoid)`.
