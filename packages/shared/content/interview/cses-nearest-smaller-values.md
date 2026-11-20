---
id: cses-nearest-smaller-values
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O(n) time and O(n) space"
reviewed: false
---

## Clarify first
- What are we searching for? For each position in the array, find the 1-based index of the nearest element to its left that has a strictly smaller value.
- What should be output if no smaller element exists to the left? Output 0 for that position.
- Are positions 1-based or 0-based in the output? 1-based (i.e. first element is at index 1).
- What are the constraints? $1 \le n \le 200000$ and $1 \le \text{arr}[i] \le 10^9$.

## Examples to say out loud
- Consider `arr = [2, 5, 1, 4, 8, 3, 2, 5]`:
  - Position 1 (val 2): no elements to left $\to 0$.
  - Position 2 (val 5): 2 is to left at index 1 and $2 < 5 \to 1$.
  - Position 3 (val 1): no element to left $< 1 \to 0$.
  - Position 4 (val 4): 1 is at index 3 and $1 < 4 \to 3$.
  - Position 5 (val 8): 4 is at index 4 and $4 < 8 \to 4$.
  - Position 6 (val 3): 1 is at index 3 and $1 < 3 \to 3$.
  - Position 7 (val 2): 1 is at index 3 and $1 < 2 \to 3$.
  - Position 8 (val 5): 2 is at index 7 and $2 < 5 \to 7$.
  - Result: `[0, 1, 0, 3, 4, 3, 3, 7]`.
- Edge case: strictly decreasing `arr = [4, 3, 2, 1]`:
  - Every element is smaller than preceding elements $\to `[0, 0, 0, 0]`$.

## Brute force
A brute-force solution would scan backwards from each element $i$ to index 0 until finding the first element strictly smaller than $\text{arr}[i]$. On a decreasing array like $[n, n-1, \dots, 1]$, each search takes $O(i)$ comparisons, yielding $O(n^2)$ total time. For $n = 200000$, $4 \times 10^{10}$ operations causes a Time Limit Exceeded. A monotonic stack computes all answers in $O(n)$ time.

## The key observation
If an earlier element $x$ at index $i$ is greater than or equal to the current element $y$ at index $j$ ($i < j$ and $x \ge y$), then $x$ can **never** serve as the nearest smaller value for $y$ or any future element to the right of $j$.
Why? Any future element that is larger than $x$ is also larger than $y$, and $y$ is closer to that future element than $x$ is!
Therefore, we can maintain a stack of pairs $(\text{value}, \text{index})$ in strictly increasing order of values. When processing $\text{arr}[i]$, we pop elements off the stack as long as $\text{stack.top().value} \ge \text{arr}[i]$. The top of the stack after popping is guaranteed to be the nearest smaller value to the left.

## Optimal approach
1. Initialize an empty stack `st` of pairs $(\text{value}, \text{1-based index})$.
2. Allocate a result vector `ans` of capacity $n$.
3. For each index $i$ from $0$ to $n - 1$:
   - While `st` is not empty and $\text{st.top().first} \ge \text{arr}[i]$:
     - Pop from `st`.
   - If `st` is empty:
     - Append 0 to `ans`.
   - Else:
     - Append $\text{st.top().second}$ to `ans`.
   - Push $(\text{arr}[i], i + 1)$ onto `st`.
4. Return `ans`.

Complexity:
- Time: $O(n)$ amortized because every element is pushed onto the stack exactly once and popped at most once across the entire algorithm.
- Space: $O(n)$ to store elements on the monotonic stack and output vector.

## Code walkthrough
- `stack<pair<int, int>> st`: Monotonic stack storing strictly increasing elements along with their 1-based indices.
- `while (!st.empty() && st.top().first >= arr[i]) st.pop()`: Eliminates all elements that are obsolete for future queries.
- `if (st.empty()) ans.push_back(0)`: No element to the left is smaller.
- `else ans.push_back(st.top().second)`: The surviving top element is the nearest smaller value to the left.
- `st.push({arr[i], i + 1})`: Adds current element as a viable nearest smaller candidate for future elements.

## Test it out loud
- Test case $1$: `[4, 3, 2, 1]`. Each element pops everything before it. Stack is empty at each step $\implies `[0, 0, 0, 0]`$.
- Test case $2$: `[1, 2, 3, 4]`. No elements popped. Top is always the immediate predecessor $\implies `[0, 1, 2, 3]`$.
- Test case $3$: `[5, 5, 5, 5]`. Strict inequality pops equal elements $\implies `[0, 0, 0, 0]`$.
- Test case $4$: `[1000000000]`. Single element $\implies `[0]`$.

## Follow-ups
- How to find the nearest smaller value to the *right*? Scan the array from right to left (from index $n - 1$ down to 0) using the identical monotonic stack logic.
- How does this building block power other algorithms? Monotonic stacks of this exact structure are used to solve Largest Rectangle in Histogram, Maximal Rectangle, and Trapping Rain Water.

## Common mistakes
- Popping strictly greater elements (`>`) instead of greater-or-equal (`>=`): If two elements are equal, neither can be strictly smaller than the other. Popping equal elements keeps the stack strictly increasing.
- 0-based vs 1-based indexing: CSES expects 1-based indices in the output, so push $i + 1$ rather than $i$.

## Further reading
- [Monotonic Stack on Wikipedia](https://en.wikipedia.org/wiki/Monotone_priority_queue)
