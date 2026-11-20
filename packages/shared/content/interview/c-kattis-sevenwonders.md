---
id: c-kattis-sevenwonders
pattern: cses-kattis
difficulty: easy
optimal: "O(n) time, O(1) space"
reviewed: false
---

## Clarify first

- What card types exist? (Three card types: `'T'`, `'C'`, and `'G'`).
- How is the base score computed? (The sum of the squares of the counts of each card type: $t^2 + c^2 + g^2$).
- How is the bonus score computed? (7 additional points for each complete set of three cards containing exactly one of each kind: $7 \times \min(t, c, g)$).
- What is the total score? (Total score is the sum of base score and bonus score: $t^2 + c^2 + g^2 + 7 \times \min(t, c, g)$).
- What are the constraints on the input string? (`1 <= cards.length <= 50`, containing only the characters `'T'`, `'C'`, and `'G'`).

## Examples to say out loud

- Mixed with complete set: `cards = "TCGTTC"`.
  - Count of `'T'`: 3.
  - Count of `'C'`: 2.
  - Count of `'G'`: 1.
  - Base score: $3^2 + 2^2 + 1^2 = 9 + 4 + 1 = 14$.
  - Number of complete sets: $\min(3, 2, 1) = 1$ set.
  - Bonus points: $1 \times 7 = 7$.
  - Total score: $14 + 7 = 21$. Output is 21.
- Homogeneous deck: `cards = "GGGGGG"`.
  - $t = 0, c = 0, g = 6$. Base score: $0^2 + 0^2 + 6^2 = 36$.
  - Complete sets: $\min(0, 0, 6) = 0$. Bonus: 0. Total score: 36. Output is 36.
- Single card: `cards = "T"`. Score: $1^2 = 1$. Output is 1.

## Brute force

A brute-force strategy might attempt to match triplets of cards greedily or with recursion, removing cards to see how many sets can be formed. However, every complete set requires exactly one of each card type (`T`, `C`, and `G`), so the maximum number of disjoint complete sets is deterministically $\min(t, c, g)$. A single counting pass over the string suffices.

## The key observation

The score calculation decouples into two parts that depend purely on the aggregate frequencies of each card type:
1. Frequency counts $t$, $c$, and $g$ can be accumulated in a single $O(n)$ pass through the string.
2. The number of complete sets is bounded by the rarest card type: $\min(t, c, g)$.
The entire score is evaluated in $O(1)$ arithmetic from these three frequencies:
$$\text{score} = t^2 + c^2 + g^2 + 7 \times \min(t, c, g)$$

## Optimal approach

1. Initialize three integer counters: `t = 0, c = 0, g = 0`.
2. Iterate through each character `ch` in the string `cards`:
   - If `ch == 'T'`, increment `t++`.
   - Else if `ch == 'C'`, increment `c++`.
   - Else increment `g++`.
3. Compute the base score: `t * t + c * c + g * g`.
4. Compute the bonus score: `7 * min({t, c, g})`.
5. Return the sum of base and bonus scores.

Complexity:
- Time: `O(n)` where $n$ is `cards.length`. We make a single scan over at most 50 characters.
- Space: `O(1)` auxiliary space as only three scalar counters are used.

## Code walkthrough

In the reference implementation:
- `int t = 0, c = 0, g = 0;`: counts occurrences of the three card categories.
- `for (char ch : cards)`: tallies each character in a single pass.
- `t * t + c * c + g * g`: computes the quadratic component of the score.
- `7 * min({t, c, g})`: awards 7 points for each distinct triplet containing one of each letter.
- Returns the total score.

## Test it out loud

- `cards = "T"`:
  - $t = 1, c = 0, g = 0$. $\min = 0$. Score: $1^2 = 1$. Returns 1.
- `cards = "TCG"`:
  - $t = 1, c = 1, g = 1$. Base: $1 + 1 + 1 = 3$. Sets: $1 \times 7 = 7$. Total: 10. Returns 10.
- `cards = "TTCCGG"`:
  - $t = 2, c = 2, g = 2$. Base: $4 + 4 + 4 = 12$. Sets: $2 \times 7 = 14$. Total: 26. Returns 26.
- `cards = "TTTTCCCG"`:
  - $t = 4, c = 3, g = 1$. Base: $16 + 9 + 1 = 26$. Sets: $1 \times 7 = 7$. Total: 33. Returns 33.

## Follow-ups

- What if there are $k$ distinct card types instead of 3?
  Use a frequency hash map or array of size $k$. The score is $\sum \text{count}_i^2 + \text{bonus} \times \min_i(\text{count}_i)$, running in $O(n + k)$ time.
- What if cards can be swapped or traded to maximize score?
  Trading cards involves shifting counts between piles: because squaring is convex, concentrating counts in one letter increases the square sum, but may sacrifice 7-point bonuses. We can test trade combinations with small dynamic programming.

## Common mistakes

- Counting complete sets by dividing total cards by 3 instead of taking $\min(t, c, g)$.
- Forgetting to square the individual counts ($t \times t$), taking $t$ linearly instead.
- Incorrect branching when checking characters, miscounting if characters other than T/C/G exist.

## Further reading

- Convex functions and superadditive scoring in game design.
- Multi-set intersection and frequency histograms.
