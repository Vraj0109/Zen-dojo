---
id: c-atc-arc065-a
pattern: cses-atcoder
difficulty: medium
optimal: "O(n) time (4 comparisons of at most 7 letters per position), O(n) space"
reviewed: false
---

## Clarify first

- What vocabulary words can be concatenated? (Four exact words: `"dream"`, `"dreamer"`, `"erase"`, and `"eraser"`).
- In what order and frequency can the words be used? (Any order, and any word can be repeated zero or more times).
- What character set does the input string contain? (The input `s` consists solely of lowercase English letters).
- What are the scale limits on string length? (`1 <= s.length <= 100000`).
- What should be returned? (A boolean `true` if `s` can be formed by concatenating words from the set, otherwise `false`).

## Examples to say out loud

- Two concatenated words: `s = "erasedream"`. Decomposes as `"erase"` (length 5) + `"dream"` (length 5). Returns `true`.
- Ambiguous prefix: `s = "dreameraser"`.
  - If we greedily take `"dreamer"` (length 7), the remaining suffix is `"aser"`, which matches none of the 4 words.
  - If we take `"dream"` (length 5), the remaining suffix is `"eraser"` (length 6), which matches perfectly.
  - Because a valid decomposition exists, returns `true`.
- Invalid suffix: `s = "dreamerer"`. After `"dream"`, we have `"erer"`. After `"dreamer"`, we have `"er"`. Neither is in the word set. Returns `false`.

## Brute force

A naive backtracking search tries to match each of the 4 words from the beginning of string `s`, and upon a match recursively calls the search on the remainder of the string. In the worst case where many overlapping prefixes match (such as repeated occurrences of `"dream"` and `"erase"`), the recursion tree branches up to $2^{n / 5}$ states. For $n = 100,000$, this unmemoized search suffers from catastrophic exponential time complexity and times out immediately.

## The key observation

The problem possesses optimal substructure with overlapping subproblems, making it a classic 1D dynamic programming problem (similar to Word Break). Let $ok[i]$ denote whether the prefix of length $i$, $s[0 \dots i-1]$, can be constructed from the given vocabulary. For each position $i \in [1, n]$, $ok[i]$ is true if there exists a word $w \in \{\text{"dream"}, \text{"dreamer"}, \text{"erase"}, \text{"eraser"}\}$ such that $ok[i - |w|]$ is true and the substring $s[i - |w| \dots i - 1]$ matches $w$. Because the vocabulary contains only 4 words with lengths between 5 and 7, checking transitions at each index $i$ takes $O(1)$ operations.

## Optimal approach

1. Define the word list: `words = ["dream", "dreamer", "erase", "eraser"]`.
2. Allocate a boolean array `ok` of size $n + 1$ initialized to false.
3. Set the base case: `ok[0] = true` (an empty string can always be formed).
4. Iterate `i` from 1 up to $n$:
   a. For each word `w` in `words`:
      - Let `len = w.length()`.
      - If $i \ge \text{len}$, $ok[i - \text{len}]$ is true, and the substring ending at $i$ equals `w`:
        - Set `ok[i] = true`.
        - (Optional): break early to proceed to the next index.
5. Return `ok[n]`.

Complexity:
- Time: `O(n)` because for each index $i \in [1, n]$, we compare at most 4 words of length at most 7, taking at most $4 \times 7 = 28$ character comparisons per index. For $n = 100,000$, this executes in about 15 ms.
- Space: `O(n)` auxiliary space for the boolean array of size $n + 1$.

## Code walkthrough

In the reference implementation:
- `const vector<string> words = {"dream", "dreamer", "erase", "eraser"};`: defines the fixed dictionary.
- `vector<char> ok(n + 1, 0); ok[0] = 1;`: allocates the prefix reachability table, seeding length 0 as reachable.
- `for (int i = 1; i <= n; i++)`: scans sequentially through the string indices.
- `if (i >= len && ok[i - len] && s.compare(i - len, len, w) == 0)`: checks if a valid prefix of length $i - \text{len}$ can be extended by word $w$.
- `ok[i] = 1;`: records that prefix of length $i$ is attainable.
- `return ok[n];`: answers whether the entire string of length $n$ is reachable.

## Test it out loud

- `s = "dream"`:
  - $i = 5$: matches `"dream"`, `ok[0] == true` $\implies ok[5] = true$. Returns `true`.
- `s = "dreamerase"`:
  - $i = 5$: matches `"dream"`, $ok[5] = true$.
  - $i = 10$: matches `"erase"`, $ok[10 - 5] = ok[5] = true \implies ok[10] = true$.
  - Returns `true`.
- `s = "dreamerer"`:
  - $ok[5] = true$ (`"dream"`), $ok[7] = true$ (`"dreamer"`).
  - No word matches at $i = 8$ or $i = 9$ from either valid prefix.
  - $ok[9] = false$. Returns `false`.

## Follow-ups

- Can we solve this greedily without dynamic programming?
  Yes, by processing the string from right to left (backwards) or reversing both $s$ and all four words. In reverse, the four words end in `"maerd"`, `"remaerd"`, `"esare"`, and `"resare"`. Notice that none of the reversed words is a prefix of another! Because no reversed word is a prefix of another, a greedy match from the end is 100% deterministic and runs in $O(n)$ time with $O(1)$ extra space.
- What if the dictionary contains thousands of arbitrary words?
  Build an Aho-Corasick automaton or a Trie of reversed words to query transitions in $O(1)$ time per character.

## Common mistakes

- Forward greedy matching without backtracking: greedily matching `"dreamer"` on `"dreamerase"` leaves `"ase"`, causing a false negative.
- Using unbounded recursive backtracking without memoization, leading to $O(2^n)$ exponential blowup on pathological inputs like `"dreamdreamdream..."`.
- Off-by-one errors in substring bounds: comparing from index $i - \text{len}$ with length $\text{len}$.

## Further reading

- Word Break dynamic programming pattern.
- Suffix-free codes and the reverse greedy matching paradigm.
