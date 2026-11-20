---
id: c-kattis-bijele
pattern: cses-kattis
difficulty: easy
optimal: "O(1) (six entries) time, O(1) space"
reviewed: false
---

## Clarify first

- What pieces constitute a complete standard chess set? (Exactly 1 king, 1 queen, 2 rooks, 2 bishops, 2 knights, and 8 pawns).
- What input format is provided? (A vector/array `found` of length 6 containing the counts of pieces found, in order: king, queen, rook, bishop, knight, pawn).
- What should be returned? (A list of 6 integers indicating how many pieces must be added to or removed from each type to match the standard set).
- What sign convention should be used? (Positive integers indicate pieces that are missing and need to be added; negative integers indicate excess pieces that must be removed; 0 indicates the count is already correct).
- What are the constraints on the input values? (The array has length 6, with each entry between 0 and 10).

## Examples to say out loud

- Example with missing and excess pieces: `found = [0, 1, 2, 2, 2, 7]`.
  - King: standard is 1, found 0 $\implies 1 - 0 = +1$ (missing 1 king).
  - Queen: standard is 1, found 1 $\implies 1 - 1 = 0$.
  - Rooks: standard is 2, found 2 $\implies 2 - 2 = 0$.
  - Bishops: standard is 2, found 2 $\implies 2 - 2 = 0$.
  - Knights: standard is 2, found 2 $\implies 2 - 2 = 0$.
  - Pawns: standard is 8, found 7 $\implies 8 - 7 = +1$ (missing 1 pawn).
  - Output: `[1, 0, 0, 0, 0, 1]`.
- Empty set: `found = [0, 0, 0, 0, 0, 0]`.
  - All pieces are missing. Output is `[1, 1, 2, 2, 2, 8]`.
- Excess pieces: `found = [2, 1, 2, 1, 2, 1]`.
  - King: $1 - 2 = -1$.
  - Queen: $1 - 1 = 0$.
  - Rook: $2 - 2 = 0$.
  - Bishop: $2 - 1 = 1$.
  - Knight: $2 - 2 = 0$.
  - Pawn: $8 - 1 = 7$.
  - Output: `[-1, 0, 0, 1, 0, 7]`.

## Brute force

Because there are only 6 piece types, a brute-force approach that checks each piece individually against the required counts performs exactly 6 subtraction operations. There are no permutations, combinations, or search spaces to explore. The baseline approach of comparing each piece type directly is already optimal.

## The key observation

The required number of pieces of each category is fixed:
$$\text{required} = [1, 1, 2, 2, 2, 8]$$
For each piece index $i \in [0, 5]$, the number of pieces needed is simply:
$$\text{diff}[i] = \text{required}[i] - \text{found}[i]$$
Subtracting the found count from the standard count automatically satisfies both missing (positive) and excess (negative) conventions.

## Optimal approach

1. Define the constant target array: `target = [1, 1, 2, 2, 2, 8]`.
2. Allocate an output array or vector `ans` of length 6.
3. For each index `i` from 0 to 5:
   - Compute `ans[i] = target[i] - found[i]`.
4. Return `ans`.

Complexity:
- Time: `O(1)` as the loop runs for exactly 6 fixed iterations.
- Space: `O(1)` auxiliary space beyond the 6-element result array.

## Code walkthrough

In the reference implementation:
- `const int correct[6] = {1, 1, 2, 2, 2, 8};`: hardcodes the standard piece distribution in chess.
- `vector<int> out(6);`: preallocates the fixed-size output vector.
- `for (int i = 0; i < 6; i++) out[i] = correct[i] - found[i];`: computes the signed difference for each of the six piece classes.
- `return out;`: returns the resulting vector.

## Test it out loud

- `found = [0, 1, 2, 2, 2, 7]`:
  - $1 - 0 = 1, 1 - 1 = 0, 2 - 2 = 0, 2 - 2 = 0, 2 - 2 = 0, 8 - 7 = 1$.
  - Returns `[1, 0, 0, 0, 0, 1]`.
- `found = [2, 1, 2, 1, 2, 1]`:
  - Returns `[-1, 0, 0, 1, 0, 7]`.
- `found = [1, 1, 2, 2, 2, 8]`:
  - All match standard. Returns `[0, 0, 0, 0, 0, 0]`.

## Follow-ups

- What if pieces are given as a string of characters (e.g. `"KQRRBBNPPPPPPPP"`)?
  Count frequencies of each character using a frequency hash map or array, and subtract from the required frequencies.
- What if we are tracking piece sets for different board game variants (e.g., Shogi, Xiangqi, or Capablanca chess)?
  Parameterize the `correct` reference array with the ruleset configuration.

## Common mistakes

- Reversing the order of subtraction: computing `found[i] - correct[i]`, which inverts positive and negative signs.
- Transposing piece positions (e.g., swapping rooks and knights).
- Reallocating dynamic vectors on each step instead of using fixed size 6.

## Further reading

- Elementary vector arithmetic and difference arrays.
- FIDE Laws of Chess piece count specifications.
