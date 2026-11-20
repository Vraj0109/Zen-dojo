---
id: c-cf-734a
pattern: cses-codeforces
difficulty: easy
optimal: "O(n) time, O(1) space"
reviewed: false
---

## Clarify first
- What does the string $s$ record? The outcomes of chess games played between Anton and Danik.
- What do the characters mean?
  - `'A'`: Anton won that game.
  - `'D'`: Danik won that game.
- How is the tournament winner determined?
  - If Anton won more games than Danik, return `"Anton"`.
  - If Danik won more games than Anton, return `"Danik"`.
  - If both players won the exact same number of games, return `"Friendship"`.
- What are the constraints on $s$? $1 \le |s| \le 100,000$, containing only `'A'` and `'D'`.

## Examples to say out loud
- Consider `s = "ADAAAA"`.
  Anton won 5 games, Danik won 1 game.
  $5 > 1 \to$ return `"Anton"`.
- Consider `s = "DDDAADA"`.
  Danik won 4 games ('D'), Anton won 3 games ('A').
  $4 > 3 \to$ return `"Danik"`.
- Consider `s = "DADADA"`.
  Anton won 3 games, Danik won 3 games.
  Tied count $\to$ return `"Friendship"`.

## Brute force
Because every game outcome must be counted to determine who won more, any correct solution must inspect the characters of string $s$. Counting occurrences in a single pass takes $O(n)$ time and $O(1)$ memory, which is both minimal and optimal.

## The key observation
We count the total occurrences of `'A'` (let this be $a$) and the total occurrences of `'D'` (let this be $d = |s| - a$).
Then:
- If $a > d$, Anton won more $\to$ `"Anton"`.
- If $d > a$, Danik won more $\to$ `"Danik"`.
- If $a == d$, the game is tied $\to$ `"Friendship"`.

## Optimal approach
1. Initialize two counters: `a = 0` and `d = 0`.
2. Iterate through each character $c$ in string $s$:
   - If $c == \text{'A'}$, increment `a++`.
   - Else, increment `d++`.
3. If $a > d$, return `"Anton"`.
4. If $d > a$, return `"Danik"`.
5. Otherwise, return `"Friendship"`.
6. Complexity:
   - Time Complexity: $O(n)$, where $n$ is the length of string $s$ (up to 100,000). We inspect each character once.
   - Space Complexity: $O(1)$, using only two integer counters.

## Code walkthrough
- `int a = 0, d = 0;`: Counters for Anton's and Danik's wins.
- `for (char c : s) if (c == 'A') a++; else d++;`: Tally wins in a single linear scan.
- `if (a > d) return "Anton"; if (d > a) return "Danik";`: Determine winner.
- `return "Friendship";`: Fallback on tie.

## Test it out loud
- Test 1: `s = "A"` $\to a = 1, d = 0 \to$ `"Anton"`.
- Test 2: `s = "D"` $\to a = 0, d = 1 \to$ `"Danik"`.
- Test 3: `s = "AD"` $\to a = 1, d = 1 \to$ `"Friendship"`.
- Test 4: `s = "AAAA"` $\to a = 4, d = 0 \to$ `"Anton"`.
- Test 5: `s = "DADADA"` $\to a = 3, d = 3 \to$ `"Friendship"`.

## Follow-ups
- How to write this with only a single counter?
  Initialize `diff = 0`. For each character, add $+1$ for 'A' and $-1$ for 'D'. At the end, if $\text{diff} > 0$ return `"Anton"`, if $\text{diff} < 0$ return `"Danik"`, else `"Friendship"`.
- What if draws were possible in individual games (e.g. marked with 'T')?
  Draws simply do not increment either player's win count; compare $a$ and $d$ identically at the end.

## Common mistakes
- Misspelling `"Friendship"` or returning `"Draw"` instead of the required literal string.
- Case-sensitivity errors (e.g. comparing with `'a'` instead of `'A'`).
