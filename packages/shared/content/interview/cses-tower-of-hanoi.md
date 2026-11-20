---
id: cses-tower-of-hanoi
pattern: cses-introductory
difficulty: medium
optimal: "O(2^n) time and O(2^n) space"
reviewed: false
---

## Clarify first
- What are the rods? Three rods numbered 1, 2, and 3.
- What is the initial state? Rod 1 holds $n$ discs sorted in descending order of size from bottom to top; rods 2 and 3 are empty.
- What are the rules? In one move, take the topmost disc of any rod and place it on another rod. A larger disc can never be placed on top of a smaller disc.
- What is the goal? Transfer all $n$ discs from rod 1 to rod 3 in the minimum number of moves.
- What are the constraints on $n$? $1 \le n \le 16$.
- How should moves be formatted? As a list of pairs `[from, to]`.

## Examples to say out loud
- Consider $n = 1$:
  - Move the single disc directly from rod 1 to rod 3: `[[1, 3]]`.
  - Total moves = $2^1 - 1 = 1$.
- Consider $n = 2$:
  - Move smallest disc from rod 1 to auxiliary rod 2: `[1, 2]`.
  - Move largest disc from rod 1 to destination rod 3: `[1, 3]`.
  - Move smallest disc from rod 2 to destination rod 3: `[2, 3]`.
  - Result: `[[1, 2], [1, 3], [2, 3]]`.
  - Total moves = $2^2 - 1 = 3$.

## Brute force
A brute-force approach would model the three rods as stacks and run breadth-first search (BFS) over state configurations to find the shortest path. With 3 rods and $n$ discs, there are $3^n$ reachable states. For $n = 16$, $3^{16} \approx 4.3 \times 10^7$ states, making BFS much slower and memory intensive. The recursive divide-and-conquer solution generates the unique minimal path directly without search.

## The key observation
To move the largest disc (disc $n$) from source rod $A$ to target rod $C$, the top $n - 1$ smaller discs must first be out of the way on auxiliary rod $B$.
Once disc $n$ is moved from $A$ to $C$, those $n - 1$ discs on $B$ must then be moved from $B$ to $C$ using $A$ as the auxiliary rod.
This gives the fundamental recurrence:
1. Move $n - 1$ discs from $A$ to $B$ using $C$.
2. Move disc $n$ from $A$ to $C$.
3. Move $n - 1$ discs from $B$ to $C$ using $A$.
The total number of moves satisfies $M(n) = 2M(n - 1) + 1 = 2^n - 1$. For $n \le 16$, $2^{16} - 1 = 65535$ moves.

## Optimal approach
1. Define a helper function `go(n, from, to, via)`:
   - If $n == 0$, return.
   - Recurse: `go(n - 1, from, via, to)`.
   - Record the move `[from, to]` in the output list.
   - Recurse: `go(n - 1, via, to, from)`.
2. Initialize an empty list of pairs.
3. Call `go(n, 1, 3, 2)` to move $n$ discs from rod 1 to rod 3 via rod 2.
4. Return the list of moves.

Complexity:
- Time: $O(2^n)$ because the recurrence visits $2^n - 1$ states, performing $O(1)$ work per move.
- Space: $O(2^n)$ to hold the output list, with $O(n)$ recursion call stack depth.

## Code walkthrough
- `if (n == 0) return`: Base case when there are no discs left to move.
- `go(n - 1, from, via, to)`: Moves the top $n - 1$ discs from `from` to `via`, using `to` as the temporary buffer.
- `out.push_back({from, to})`: Moves the largest remaining disc directly to its final destination.
- `go(n - 1, via, to, from)`: Moves the $n - 1$ discs from `via` to `to`, using `from` as the temporary buffer.
- `go(n, 1, 3, 2)`: Starts the recursion from rod 1 to rod 3 with rod 2 as auxiliary.

## Test it out loud
- Test case $1$: $n = 1 \implies$ `[[1, 3]]`.
- Test case $2$: $n = 2 \implies$ `[[1, 2], [1, 3], [2, 3]]`.
- Test case $3$: $n = 3 \implies$ 7 moves: `[[1, 3], [1, 2], [3, 2], [1, 3], [2, 1], [2, 3], [1, 3]]`.
- Test case $4$: $n = 4 \implies 2^4 - 1 = 15$ moves.

## Follow-ups
- Can Tower of Hanoi be solved iteratively? Yes. For odd $n$, alternate valid moves between the smallest disc (cycling $1 \to 3 \to 2 \to 1$) and the only other legal non-smallest disc move.
- How is Tower of Hanoi related to Gray codes? The sequence of discs moved in the recursive solution corresponds to the bit positions flipped in an $n$-bit reflected Gray code.

## Common mistakes
- Confusing rod roles in the recursive steps: In the first recursive call, `to` and `via` swap roles; in the second recursive call, `from` and `via` swap roles.
- 0-indexed vs 1-indexed rod numbers: The problem requires rods numbered 1, 2, and 3.

## Further reading
- [Tower of Hanoi on Wikipedia](https://en.wikipedia.org/wiki/Tower_of_Hanoi)
