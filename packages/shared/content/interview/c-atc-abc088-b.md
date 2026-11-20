---
id: c-atc-abc088-b
pattern: cses-atcoder
difficulty: easy
optimal: "O(n log n) time, O(1) extra space"
reviewed: false
---

## Clarify first

- Who moves first and how do turns alternate? (Alice takes the first turn, and players take turns alternately taking one card).
- What strategy do the players follow? (Both players play optimally by greedily selecting the card with the highest value remaining).
- What is the goal and return value? (Return Alice's total score minus Bob's total score).
- What are the constraints on the number of cards and their values? (`1 <= cards.length <= 100000`, and each card value is $1 \le cards[i] \le 100$).
- Can card values be duplicated? (Yes, cards can share identical values).

## Examples to say out loud

- Two cards: `cards = [3, 1]`. Alice takes 3, Bob takes 1. Alice's score is 3, Bob's is 1. Difference: $3 - 1 = 2$.
- Three cards: `cards = [2, 7, 4]`. Sorted descending: $[7, 4, 2]$. Alice takes 7, Bob takes 4, Alice takes 2. Alice's total is $7 + 2 = 9$, Bob's is 4. Difference: $9 - 4 = 5$.
- Identical cards: `cards = [5, 5]`. Alice takes 5, Bob takes 5. Difference: $5 - 5 = 0$.
- Single card: `cards = [1]`. Alice takes 1, Bob gets nothing. Difference: 1.

## Brute force

A naive simulation without sorting repeatedly scans the array $n$ times: in each of the $n$ turns, find the maximum remaining element in $O(n)$ time, add or subtract it from the score, and remove or mark it as visited. With $n \le 100,000$, finding the maximum $n$ times takes $O(n^2)$ operations ($\approx 10^{10}$ steps), which exceeds the standard time limit.

## The key observation

Because both players always select the card with the largest remaining value, the game sequence is entirely deterministic. If we sort the cards in descending order, Alice always receives the cards at even indices ($0, 2, 4, \dots$) and Bob always receives the cards at odd indices ($1, 3, 5, \dots$). Computing the alternating sum $\sum_{i=0}^{n-1} (-1)^i \cdot cards[i]$ directly yields the difference.

## Optimal approach

1. Sort the `cards` array in descending order.
2. Initialize an integer variable `diff = 0`.
3. Iterate through the sorted array with index `i` from 0 to $n - 1$:
   a. If `i` is even (`i % 2 == 0`), Alice took the card: add `cards[i]` to `diff`.
   b. If `i` is odd, Bob took the card: subtract `cards[i]` from `diff`.
4. Return `diff`.

Complexity:
- Time: `O(n log n)` to sort the array of $n$ elements, followed by an $O(n)$ linear alternating sum pass. For $n = 100,000$, this takes about 15 ms.
- Space: `O(1)` auxiliary space if sorting in-place (or $O(\log n)$ for recursive sorting call stack).

## Code walkthrough

In the reference implementation:
- `sort(cards.rbegin(), cards.rend());`: sorts the vector in descending order in $O(n \log n)$ time.
- `int diff = 0;`: tracks the net point difference between Alice and Bob.
- `for (size_t i = 0; i < cards.size(); i++)`: iterates sequentially through the cards chosen by alternating players.
- `diff += (i % 2 == 0) ? cards[i] : -cards[i];`: adds cards taken by Alice (even positions) and subtracts cards taken by Bob (odd positions).
- `return diff;`: returns the final score difference.

## Test it out loud

- `cards = [1]`:
  - Sorted: `[1]`.
  - `i = 0`: even, `diff += 1`.
  - Returns 1.
- `cards = [5, 5]`:
  - Sorted: `[5, 5]`.
  - `i = 0`: `diff = 5`.
  - `i = 1`: `diff = 5 - 5 = 0`.
  - Returns 0.
- `cards = [100, 100, 100]`:
  - Sorted: `[100, 100, 100]`.
  - Alice takes 1st ($+100$), Bob takes 2nd ($-100$), Alice takes 3rd ($+100$).
  - `diff = 100 - 100 + 100 = 100`. Returns 100.

## Follow-ups

- Can this be solved in $O(n)$ time?
  Yes, notice that card values are constrained between 1 and 100. We can use counting sort with a frequency array of size 101 in $O(n + 100) = O(n)$ time and $O(1)$ extra space, avoiding the $O(n \log n)$ comparison sort overhead.
- What if cards can have negative values?
  If negative cards are allowed, players would prefer not to pick negative cards if skipping is allowed. If picking remains mandatory until the deck is empty, the greedy strategy remains identical: taking the least negative card minimizes damage.

## Common mistakes

- Sorting in ascending order and confusing which player gets which end when $n$ is odd. Sorting descending ensures index 0 always belongs to Alice regardless of parity.
- Subtracting the scores backwards (Bob minus Alice instead of Alice minus Bob).
- Using repeated max-element search without sorting, leading to $O(n^2)$ time limit timeouts.

## Further reading

- Greedy choice property and combinatorial game theory basics.
- Counting sort algorithm for small integer value domains.
