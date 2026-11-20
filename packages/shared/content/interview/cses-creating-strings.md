---
id: cses-creating-strings
pattern: cses-introductory
difficulty: medium
optimal: "O(n \times n!) time and O(n \times n!) space"
reviewed: false
---

## Clarify first
- What are we asked to produce? All unique strings that can be made by reordering the characters of the input string.
- Should identical rearrangements appear multiple times? No, duplicate permutations must be excluded.
- What order should the results follow? The output list must be sorted in alphabetical order.
- What are the input constraints? $1 \le |s| \le 8$, and $s$ contains only lowercase English letters.

## Examples to say out loud
- Consider $s = \text{"aab"}$:
  - Characters: two 'a's, one 'b'.
  - Sorted order permutations:
    - "aab"
    - "aba"
    - "baa"
  - Output: `["aab", "aba", "baa"]`.
- Edge case: $s = \text{"a"}$:
  - Only one rearrangement exists: `["a"]`.
- Consider $s = \text{"aa"}$:
  - Both letters are identical: `["aa"]`.

## Brute force
A naive permutation generator could generate all $n!$ index permutations (treating identical characters at different indices as distinct) and insert them into a hash set or tree set to filter out duplicates. For $n \le 8$, $8! = 40320$, so even this brute force finishes quickly. However, generating duplicate permutations and doing set insertions incurs unnecessary overhead. Generating unique permutations directly in lexicographical order is cleaner and optimal.

## The key observation
If we sort the string characters initially, the string itself is its own lexicographically first permutation. We can then repeatedly apply the standard next permutation algorithm (lexicographical permutation step), which directly skips duplicates without set hashing and naturally yields strings in alphabetical order. Alternatively, a recursive backtracking approach that skips identical adjacent elements (i.e. `if (i > 0 && s[i] == s[i - 1] && !used[i - 1]) continue;`) constructs each unique string in lexicographical order.

## Optimal approach
1. Sort the input string characters in ascending order.
2. Initialize an empty list `out`.
3. Use a do-while loop:
   - Append the current state of string $s$ to `out`.
   - Call the lexicographical next permutation transition.
   - Continue until no further lexicographical permutations exist (all elements are in descending order).
4. Return `out`.

Complexity:
- Time: $O(n \times k)$ where $k \le n!$ is the number of unique permutations. For $n \le 8$, $k \le 40320$, and each step takes amortized $O(n)$ time.
- Space: $O(n \times k)$ to store the output list of strings.

## Code walkthrough
- `sort(s.begin(), s.end())`: Orders characters ascending, which is required so that the sequence of generated permutations starts at the alphabetical beginning.
- `vector<string> out`: Stores the resulting distinct strings in alphabetical order.
- `do { out.push_back(s); } while (next_permutation(s.begin(), s.end()))`: `next_permutation` computes the lexicographically next distinct rearrangement in-place in amortized $O(1)$ operations, and returns false once the descending arrangement wraps back to ascending.
- `return out`: Returns the complete ordered list of unique strings.

## Test it out loud
- Test case $1$: $s = \text{"ab"}$. Starts "ab", next is "ba", loop exits. Returns `["ab", "ba"]`.
- Test case $2$: $s = \text{"aa"}$. Starts "aa", next returns false immediately. Returns `["aa"]`.
- Test case $3$: $s = \text{"abc"}$. Generates all 6 permutations: "abc", "acb", "bac", "bca", "cab", "cba".
- Test case $4$: $s = \text{"aabb"}$. Produces 6 permutations: "aabb", "abab", "abba", "baab", "baba", "bbaa".

## Follow-ups
- How does `next_permutation` work under the hood? It scans from right to find the first decrease $i$ where $s[i] < s[i + 1]$, finds the smallest element to the right larger than $s[i]$, swaps them, and reverses the suffix after $i$.
- What if the string length is up to 20? The number of permutations ($20! \approx 2.4 \times 10^{18}$) cannot be stored or generated; we would instead count permutations using multinomial coefficients $\frac{n!}{\prod c_i!}$ or generate by index (k-th permutation).

## Common mistakes
- Forgetting to sort before calling `next_permutation`: If the input is "ba", calling `next_permutation` directly only captures "ba" and misses "ab".
- Using an unordered set to deduplicate: Unordered sets do not preserve alphabetical order, requiring an extra sorting step of size $O(k \log k)$.
- Recursion without used flags or duplicate checks: Generating all permutations recursively without duplicate branching causes exponential blowup on strings with identical characters (e.g. "aaaaaaaa").

## Further reading
- [Permutation Generation Algorithms on Wikipedia](https://en.wikipedia.org/wiki/Permutation#Algorithms_to_generate_permutations)
