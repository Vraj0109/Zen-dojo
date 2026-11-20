---
id: cses-palindrome-queries
pattern: cses-misc
difficulty: medium
optimal: "O((n + q) log n) time and O(n) space"
reviewed: false
---

## Clarify first
- What are the inputs? A string `s` of length `n`, and a list of queries.
- What are the query types?
  - Type 1: `['1', k, c]` -> Update character at 1-based index `k` to character `c`.
  - Type 2: `['2', a, b]` -> Check if substring `s[a...b]` (1-based) is a palindrome. Return `"YES"` or `"NO"`.
- What are the constraints? `n <= 2 * 10^5`, number of queries `q <= 2 * 10^5`.
- Can point updates happen dynamically between queries? Yes, queries can be interleaved arbitrarily.

## Examples to say out loud
- Consider `s = "aybabtu"`:
  - Query `['2', 1, 3]`: Substring `"ayb"` is not a palindrome -> `"NO"`.
  - Query `['2', 3, 5]`: Substring `"bab"` is a palindrome -> `"YES"`.
  - Query `['1', 3, 'x']`: Updates `s[3]` to `'x'`, string becomes `"ayxabtu"`.
  - Query `['2', 3, 5]`: Substring `"xab"` is not a palindrome -> `"NO"`.
  - Output: `["NO", "YES", "NO"]`.

## Brute force
For each type 2 query `[a, b]`, checking if `s[a...b]` is a palindrome with two pointers takes O(b - a + 1) = O(n) time. Across `q = 2 * 10^5` queries, the worst-case runtime would be O(q * n) = 4 * 10^{10} operations, which will cause Time Limit Exceeded. We need logarithmic time per query.

## The key observation
A substring `s[a...b]` is a palindrome if and only if reading it forward is identical to reading it backwards.
In terms of polynomial rolling hashes:
`forward_hash(s[a...b]) == backward_hash(s[a...b])`.
To support point character updates in O(log n) time and range hash queries in O(log n) time, we can maintain two **Binary Indexed Trees (Fenwick Trees)** or **Segment Trees**:
1. `bit_forward`: stores `s[i] * B^i` for 1-based index `i`.
2. `bit_backward`: stores `s[i] * B^(n - i + 1)` for 1-based index `i`.
When querying `s[a...b]`:
- Forward hash is `(sum_forward(a...b) * B^{-a}) mod M`.
- Backward hash is `(sum_backward(a...b) * B^{-(n - b + 1)}) mod M`.
Aligning the base powers allows an exact equality comparison in O(log n) time. Using a large 64-bit prime modulus (or double hashing) guarantees no hash collisions.

## Optimal approach
1. Choose a hash base `B = 313` and modulus `M = 10^9 + 9` (or `10^9 + 7`). Precompute powers of `B`: `pow_B[i] = (pow_B[i - 1] * B) % M`.
2. Build two Fenwick trees of size `n`:
   - `ft_fwd` storing terms `(s[i] - 'a' + 1) * pow_B[i]`.
   - `ft_bwd` storing terms `(s[i] - 'a' + 1) * pow_B[n - i + 1]`.
3. For type 1 query `[1, k, c]`:
   - Let `old_c = s[k]`. Update `s[k] = c`.
   - Compute `diff = (c - old_c) % M`.
   - Update `ft_fwd` at position `k` by `diff * pow_B[k]`.
   - Update `ft_bwd` at position `k` by `diff * pow_B[n - k + 1]`.
4. For type 2 query `[2, a, b]`:
   - Compute range sum on `ft_fwd` in `[a, b]`: `h_fwd = query(ft_fwd, a, b)`.
   - Compute range sum on `ft_bwd` in `[a, b]`: `h_bwd = query(ft_bwd, a, b)`.
   - Multiply by opposite powers to align scales:
     `norm_fwd = (h_fwd * pow_B[n - b + 1]) % M`
     `norm_bwd = (h_bwd * pow_B[a]) % M`
   - If `norm_fwd == norm_bwd`, answer `"YES"`, else `"NO"`.
5. Return all type 2 answers.

Complexity:
- Time complexity: O(n log n) for building the Fenwick trees, and O(log n) per query (both update and range query). Total time is O((n + q) log n), executing comfortably in ~0.2s for 2 * 10^5 queries.
- Space complexity: O(n) auxiliary space to store Fenwick trees and powers array.

## Code walkthrough
- `struct FenwickTree`: Standard 1-indexed BIT supporting `add(idx, val)` and `query(idx)` with modulo arithmetic.
- `ft_fwd.add(i, val * pow_B[i])`: Weights character by its forward position.
- `ft_bwd.add(i, val * pow_B[n - i + 1])`: Weights character by its reverse position.
- Normalization step: `val_fwd * pow_B[n - b + 1] % M == val_bwd * pow_B[a] % M` compares the two directional substrings with matching base powers without needing modular inverse.

## Test it out loud
- Single letter `s = "a"`, query `[2, 1, 1]`: Always returns `"YES"`. Correct.
- `s = "abba"`, query `[2, 1, 4]`: Symmetrical characters produce identical aligned hashes -> `"YES"`. Correct.
- `s = "abca"`, update `[1, 3, 'b']` makes string `"abba"`, query `[2, 1, 4]` returns `"YES"`. Correct.

## Follow-ups
- How to eliminate hash collision vulnerability against adversarial test data? Use double hashing with two coprime moduli (e.g. `10^9 + 7` and `10^9 + 9`), or choose a random 64-bit prime modulus generated at runtime.

## Common mistakes
- Comparing raw range hash values without aligning powers, causing mismatch because forward and backward hashes are shifted by different base exponents.
- Using modular division / inverse per query instead of multiplying each side by the complementary power.
