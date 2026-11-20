---
id: cses-string-matching
pattern: CSES: range, tree, math, string
difficulty: medium
optimal: "O(|s| + |pattern|) time, O(|pattern|) space"
reviewed: false
---

## Clarify first
- Are overlapping occurrences counted? Yes, occurrences can overlap. For example, pattern "aa" occurs 4 times in "aaaaa".
- What characters can the strings contain? Only lowercase English letters ('a' through 'z').
- What are the length constraints? Both s and pattern have lengths between 1 and 1,000,000.
- What if the pattern is longer than s? Return 0 because a longer pattern cannot appear inside a shorter string.
- What should be returned? An integer representing the total count of occurrences of pattern in s.

## Examples to say out loud
Suppose s = "saippuakauppias" and pattern = "pp".
The pattern "pp" matches at index 4 ("..ppu..") and index 11 ("..ppi..").
Total occurrences = 2.

Suppose s = "aaaaa" and pattern = "aa".
The pattern matches starting at index 0, 1, 2, and 3.
Overlapping occurrences are valid, so total count = 4.

Suppose s = "hello" and pattern = "world".
No characters match the pattern sequence, so count = 0.

## Brute force
A naive substring comparison checks every starting position i in s from 0 to |s| - |pattern|:
`for (int i = 0; i <= n - m; i++) if (s.substr(i, m) == pattern) count++;`
In the worst case (such as s = "a...ab" and pattern = "a...ac"), checking each starting index takes O(|pattern|) character comparisons.
The worst-case runtime is O(|s| * |pattern|).
For |s| = 1,000,000 and |pattern| = 1,000,000, 10^12 operations will drastically exceed the time limit.
The Knuth-Morris-Pratt (KMP) algorithm eliminates redundant comparisons, guaranteeing linear time.

## The key observation
When a mismatch occurs after matching several characters, we do not need to restart searching from the next character in s.
Instead, the longest proper prefix of the matched pattern that is also a suffix of the matched pattern tells us the next valid pattern position to resume from.
This information is precomputed in the KMP prefix function (pi table), where `pi[i]` stores the length of the longest proper prefix of `pattern[0..i]` that is also a suffix of `pattern[0..i]`.
Using `pi`, when a mismatch occurs or when a full match is completed, the pattern pointer jumps to `pi[j - 1]`, advancing through string s in strictly linear time without backtracking.

## Optimal approach
1. Let n = |s| and m = |pattern|. If m == 0 or n < m, return 0.
2. Build the KMP prefix array `pi` of length m:
   - Initialize `pi[0] = 0` and pointer `j = 0`.
   - For `i` from 1 to m - 1:
     - While `j > 0` and `pattern[i] != pattern[j]`, fallback to `j = pi[j - 1]`.
     - If `pattern[i] == pattern[j]`, increment `j`.
     - Assign `pi[i] = j`.
3. Search for pattern occurrences in s:
   - Initialize `count = 0` and pattern index `j = 0`.
   - For `i` from 0 to n - 1:
     - While `j > 0` and `s[i] != pattern[j]`, fallback to `j = pi[j - 1]`.
     - If `s[i] == pattern[j]`, increment `j`.
     - If `j == m`: increment `count` and fallback to `j = pi[j - 1]` to permit overlapping matches.
4. Return `count`.

Complexity: O(|s| + |pattern|) time because both pattern preprocessing and text scanning advance in amortized linear time, and O(|pattern|) space for the pi table.

## Code walkthrough
In C++, `vector<int> pi(m, 0)` stores prefix values.
During preprocessing of `pattern`, the while-loop `while (j > 0 && pattern[i] != pattern[j]) j = pi[j - 1];` rewinds `j` to the previous longest common prefix.
When `pattern[i] == pattern[j]`, `j` increments and `pi[i] = j`.
During scanning of `s`, the exact same fallback logic applies.
When `j == m`, a complete occurrence is detected: we increment `count++` and reset `j = pi[j - 1]`. Setting `j = pi[j - 1]` is essential because it allows subsequent matching characters in overlapping occurrences to be captured without re-reading string s.

## Test it out loud
- Overlapping repeats: s = "ababa", pattern = "aba". First match ends at index 2 (aba). j shifts to `pi[2] = 1` ('a'). Next characters "ba" extend to another match at index 4. Count is 2.
- Pattern equals string: s = "abc", pattern = "abc". Matches once at index 2, count is 1.
- No match: s = "hello", pattern = "world". j never reaches m, count is 0.
- Single letter pattern: s = "abacaba", pattern = "a". Each 'a' matches and immediately resets, finding 4 occurrences.

## Follow-ups
- Can this be solved using the Z-algorithm? Yes, concatenate `pattern + '$' + s` and compute the Z-array. Any index in the s portion with Z-value equal to |pattern| is a match.
- What if there were multiple patterns to search for simultaneously? Use the Aho-Corasick automaton, which generalizes KMP to a trie of multiple patterns in linear time.
- Can rolling hashes (Rabin-Karp) solve this? Yes, with polynomial rolling hash, though hash collisions must be handled carefully to avoid worst-case degeneration.

## Common mistakes
- Not resetting `j = pi[j - 1]` on match: resetting `j = 0` will miss overlapping occurrences (e.g. "aa" in "aaa" would only count 1 instead of 2).
- Using 1-based indexing for `pi[j - 1]` carelessly: ensuring `j > 0` before accessing `pi[j - 1]` prevents array out-of-bounds errors.
- Constructing substrings with `s.substr()`: creating substrings allocates memory and takes O(m) time per check, converting the algorithm back to O(n * m).

## Further reading
- Knuth-Morris-Pratt string searching algorithm
- Z-algorithm for linear string matching
- Aho-Corasick multi-pattern string matching automaton
