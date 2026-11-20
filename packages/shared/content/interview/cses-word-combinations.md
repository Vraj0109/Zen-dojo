---
id: cses-word-combinations
pattern: cses-misc
difficulty: medium
optimal: "O(W + n * L) time and O(W * 26) space"
reviewed: false
---

## Clarify first
- What are the inputs? A target string `s` of length `n`, and a dictionary of `k` words `words`.
- What is the goal? Count the number of ways to form the string `s` by concatenating words from the dictionary.
- Can words be used multiple times? Yes, each word may be used an unlimited number of times.
- What modulo should be applied? Modulo `10^9 + 7`.
- What are the constraints? `n <= 5000`, `k <= 10^5`, total length of all words `W <= 10^6`. Characters are lowercase English letters.

## Examples to say out loud
- Consider `s = "abacaba"` and dictionary `["abac", "aba", "caba"]`:
  - Combination 1: `"abac"` + `"aba"` forms `"abacaba"`.
  - Combination 2: `"aba"` + `"caba"` forms `"abacaba"`.
  - Result: 2 ways.
- Consider `s = "aaaa"` and dictionary `["a", "aa"]`:
  - Number of ways to tile length 4 using tiles of size 1 and 2 is Fibonacci: 5 ways.
  - Result: 5.

## Brute force
A recursive backtracking approach trying every word in the dictionary at each position takes exponential time O(k^n). Even with memoization `dp(i)` checking every dictionary word against `s.substr(i, word.length())`, comparing all `k` words takes O(n * k * max_word_len), which is up to 5000 * 10^5 operations (~5 * 10^8), too slow. We need a Trie to match words character-by-character.

## The key observation
Define `dp[i]` as the number of ways to form prefix `s[0...i-1]`.
We start with `dp[0] = 1`.
Instead of searching through all dictionary words at index `i`, we store all words in a prefix tree (Trie).
From each index `i` where `dp[i] > 0`, we traverse down the Trie matching characters `s[j]` for `j` from `i` to `n - 1`. If the Trie node has no branch for `s[j]`, we stop immediately. If the Trie node marks the end of a dictionary word, we add `dp[i]` to `dp[j + 1]` modulo `10^9 + 7`.
This ensures we only explore valid prefixes that actually exist in the dictionary!

## Optimal approach
1. Build a Trie from all words in `words`. Each node stores 26 children pointers and a boolean `is_terminal`.
2. Initialize `dp` array of size `n + 1` with zeros, and set `dp[0] = 1`.
3. Set `MOD = 10^9 + 7`.
4. Loop `i` from 0 to `n - 1`:
   - If `dp[i] == 0`, continue.
   - Let `curr = trie_root`.
   - Loop `j` from `i` to `n - 1`:
     - Let `c = s[j] - 'a'`.
     - If `curr->children[c] == nullptr`, break.
     - Move `curr = curr->children[c]`.
     - If `curr->is_terminal`:
       - `dp[j + 1] = (dp[j + 1] + dp[i]) % MOD`.
5. Return `dp[n]`.

Complexity:
- Time complexity: O(W + n * min(n, max_len)), where `W` is the total length of all dictionary words (to build the Trie), and `n * min(n, max_len)` to run the DP. For `n = 5000`, this takes at most a few million operations, running in ~0.1s.
- Space complexity: O(W * 26) auxiliary space for the Trie nodes, plus O(n) for the `dp` array.

## Code walkthrough
- `struct TrieNode`: Contains `int next[26]` and `bool is_end`.
- `insert(word)`: Traverses and adds characters into the static array-based Trie.
- `dp[0] = 1`: Base case representing the empty prefix.
- `for (int i = 0; i < n; i++)`: Outer loop iterating over prefix split points.
- `for (int j = i; j < n; j++)`: Inner loop walking down the Trie matching `s[j]`.
- `if (node->is_end) dp[j + 1] = (dp[j + 1] + dp[i]) % MOD`: Transitions the DP count forward.
- `return dp[n]`: Final answer for the full string.

## Test it out loud
- `s = "abacaba"`, words = `["abac", "aba", "caba"]`:
  - `i = 0`: matches `"abac"` -> `dp[4] += 1`; matches `"aba"` -> `dp[3] += 1`.
  - `i = 3`: `dp[3] = 1`, matches `"caba"` -> `dp[7] += 1`.
  - `i = 4`: `dp[4] = 1`, matches `"aba"` -> `dp[7] += 1`.
  - `dp[7] = 2`. Correct.
- Impossible string `s = "abc"`, words = `["ab", "d"]`: `dp[3]` remains 0. Correct.

## Follow-ups
- How would you optimize the Trie memory layout? Instead of pointer-based allocations (`new TrieNode`), use flat 1D / 2D integer arrays (`trie[node_count][26]`), which improves cache locality and avoids allocation overhead.

## Common mistakes
- Building the DP backwards without a Trie, resulting in quadratic string hashing and TLE.
- Forgetting to take modulo at each addition, leading to integer overflow.
