---
id: c-rabin-karp
pattern: String matching
difficulty: medium
optimal: "O(n + m) average time, O(n) space"
reviewed: false
---

## Clarify first
- What inputs are provided? Two strings: `pattern` of length m and `text` of length n.
- What should be returned? A list of all 0-based starting indices where `pattern` occurs in `text`, ordered from smallest to largest index.
- What if `pattern` is longer than `text` or does not appear? Return an empty list.
- What characters appear in `pattern` and `text`? Lowercase English letters 'a' through 'z'.
- What are the length constraints? Both lengths can be up to 100,000.

## Examples to say out loud
Suppose pattern = "aba", text = "abacaba":
- At index 0: text[0..2] is "aba", matches pattern. Index 0 added.
- At index 1: text[1..3] is "bac", no match.
- At index 2: text[2..4] is "aca", no match.
- At index 3: text[3..5] is "cab", no match.
- At index 4: text[4..6] is "aba", matches pattern. Index 4 added.
Return [0, 4].

Suppose pattern = "xyz", text = "abcdef":
- No occurrence found, return [].

Suppose pattern = "longer", text = "short":
- Pattern length 6 > text length 5, return [].

## Brute force
Check every starting index `i` from 0 to `n - m` by comparing each character of `pattern` with `text[i..i+m-1]`.
In the worst case (e.g., pattern = "aaa...b", text = "aaa...a"), each check takes O(m) operations.
Total worst-case time is O(n * m).
With n = 100,000 and m = 100,000, n * m = 10^10 comparisons, causing Time Limit Exceeded.
Rabin-Karp avoids full character comparisons by computing rolling hashes in O(1) time per window.

## The key observation
We map every string of length m to an integer using polynomial rolling hashing:
`hash(s) = sum( (s[i] - 'a' + 1) * p^i ) mod M`, where p is a prime (such as 31) and M is a large prime modulus (such as 10^9 + 9).
By precomputing prefix hashes for `text`:
The hash of substring `text[i..i+m-1]` shifted by `p^i` equals:
`(prefix_hash[i + m] - prefix_hash[i]) mod M`.
Comparing this with `(pattern_hash * p^i) mod M` checks if the hashes match in O(1) time without computing modular inverse.
Only when the hashes match do we perform an explicit character check to verify the match and avoid false positives from hash collisions.

## Optimal approach
1. Let `m = pattern.length()` and `n = text.length()`.
2. If `m > n` or `m == 0`, return an empty list immediately.
3. Precompute powers of base `p = 31` modulo `M = 10^9 + 9`: `p_pow[k] = (p_pow[k - 1] * p) % M`.
4. Precompute prefix hashes of `text`:
   - `h[i + 1] = (h[i] + (text[i] - 'a' + 1) * p_pow[i]) % M`.
5. Compute the hash of `pattern`:
   - `h_pattern = sum((pattern[i] - 'a' + 1) * p_pow[i]) % M`.
6. For each starting position `i` from 0 to `n - m`:
   - Extract window hash: `cur_h = (h[i + m] - h[i] + M) % M`.
   - Expected hash: `target_h = (h_pattern * p_pow[i]) % M`.
   - If `cur_h == target_h`:
     - Verify with `text.compare(i, m, pattern) == 0`.
     - If identical, append index `i` to results.
7. Return results list.

Complexity: O(n + m) average time because hash collisions are rare with a large prime modulus, and O(n) space for prefix hash and power tables.

## Code walkthrough
In C++, `p_pow` precomputes base powers up to `max(n, m)`.
`h` stores 1-indexed prefix hashes so `h[i + p_len] - h[i]` directly represents the slice spanning `i` to `i + p_len - 1`.
`cur_h == (h_s * p_pow[i]) % m` compares the aligned hash values without dividing or taking modular inverse.
`text.compare(i, p_len, pattern) == 0` validates potential candidate matches, ensuring deterministic correctness even against adversarial hash collisions.

## Test it out loud
- Base case exact match: pattern = "abc", text = "abc", m = n = 3. Loop checks index 0, hash matches, string matches, returns [0].
- Pattern longer than text: pattern = "long", text = "lo". Guard condition `p_len > t_len` triggers, returns [].
- Repeating characters: pattern = "aa", text = "aaaaa". Matches found at indices 0, 1, 2, 3, returns [0, 1, 2, 3].
- Disjoint characters: pattern = "b", text = "a", returns [].

## Follow-ups
- How to reduce collision probability to virtually zero without string verification? Use double hashing with two independent prime moduli (e.g., 10^9 + 7 and 10^9 + 9) and two distinct bases (e.g., 31 and 37).
- How does Rabin-Karp compare to KMP and Z-algorithm? KMP and Z-algorithm offer strict O(n + m) worst-case time without depending on randomized or probabilistic properties. Rabin-Karp is especially advantageous for 2D pattern matching and multi-pattern matching.
- Can Rabin-Karp be extended to search for multiple patterns simultaneously? Yes, store pattern hashes in a hash set; if all patterns have length m, searching takes O(n + m * k) average time.

## Common mistakes
- Negative modulo results: in C++ and Java, `(a - b) % M` can be negative; always add M before taking modulo: `(a - b + M) % M`.
- Omitting character verification: relying purely on hash equality without verification risks false positives on hash collisions.
- 32-bit integer overflow: multiplying two numbers modulo 10^9 can produce results up to 10^18, requiring 64-bit integers (`long long` in C++, `long` in Java).

## Further reading
- Polynomial rolling hash techniques
- Rabin-Karp algorithm for multiple pattern matching
- Double hashing collision resistance analysis
