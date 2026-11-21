---
id: abc171-b
pattern: cses-atcoder
difficulty: medium
optimal: "O(n log n) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What does the shop sell? $n$ distinct kinds of fruit, where the $i$-th kind costs $p[i]$ yen.
- What are we purchasing? Exactly $k$ different kinds of fruit, one piece of each kind.
- What is the objective? Minimize the total price paid.
- What are the constraints? $1 \le k \le n \le 1000$ and $1 \le p[i] \le 1000$.
- Can we buy multiple fruits of the same kind? No, the problem specifies buying $k$ *different* kinds of fruit.

## Examples to say out loud
- Consider $k = 2$ and $p = [50, 100, 80, 120, 80]$.
  The sorted prices are $[50, 80, 80, 100, 120]$.
  To minimize the sum of 2 items, we greedily pick the 2 cheapest fruits:
  $50 + 80 = 130$.
  Result: 130.
- Consider $k = 1$ and $p = [1000]$.
  Result: 1000.
- Consider $k = 3$ and $p = [5, 3, 9]$.
  Sorted: $[3, 5, 9]$.
  Sum of all 3: $3 + 5 + 9 = 17$.
  Result: 17.

## Brute force
A brute force approach would examine all possible subsets of size $k$ out of the $n$ available fruits ($\binom{n}{k}$ subsets), sum the prices of each subset, and find the minimum sum. For $n = 1000$ and $k = 500$, evaluating combinations is impossible. Because fruit prices contribute additively and independently, a greedy strategy is provably optimal.

## The key observation
To minimize the sum of $k$ distinct chosen elements from an array of positive costs, we must greedily choose the $k$ smallest numbers in the array.
Sorting the prices in non-decreasing order places the $k$ cheapest items at the first $k$ positions ($p[0], p[1], \dots, p[k - 1]$).
Summing these first $k$ elements yields the minimal total cost.

## Optimal approach
1. Sort the price array $p$ in ascending order.
2. Initialize an accumulator variable `sum = 0`.
3. Loop index $i$ from 0 to $k - 1$:
   - Add $p[i]$ to `sum`.
4. Return `sum`.
5. Complexity:
   - Time Complexity: $O(n \log n)$ to sort the array of $n$ prices, followed by an $O(k)$ prefix sum.
   - Space Complexity: $O(1)$ auxiliary space if sorting in-place, or $O(n)$ if cloning the array.

## Code walkthrough
- `vector<int> q = p;`: Create local copy to avoid mutating caller's input if immutability is preferred.
- `sort(q.begin(), q.end());`: Sort prices into ascending order.
- `int sum = 0;`: Running total for price of $k$ fruits.
- `for (int i = 0; i < k; i++) sum += q[i];`: Sum the $k$ lowest prices.
- `return sum;`: Return the minimum price.

## Test it out loud
- Test 1: $k = 1, p = [5, 3, 9] \to$ sorted $[3, 5, 9] \to$ sum of first 1 is 3.
- Test 2: $k = 3, p = [5, 3, 9] \to$ sum of first 3 is $3 + 5 + 9 = 17$.
- Test 3: $k = 3, p = [1, 1, 1, 1] \to 1 + 1 + 1 = 3$.
- Test 4: $k = 2, p = [1000, 1000] \to 1000 + 1000 = 2000$.
- Test 5: $k = 4, p = [4, 3, 2, 1, 10] \to$ sorted $[1, 2, 3, 4, 10] \to 1 + 2 + 3 + 4 = 10$.

## Follow-ups
- Can we achieve $O(n)$ time complexity?
  Yes! In C++, `std::nth_element` (Quickselect algorithm) partitions the $k$ smallest elements to the beginning of the array in average $O(n)$ time without fully sorting the array, followed by summing the first $k$ elements in $O(k)$.
- What if prices are bounded in a small range ($p[i] \le 1000$)?
  We can use counting sort: count frequencies of prices up to 1000 in an array of size 1001, and take the first $k$ items in $O(n + \max(P))$ time and $O(\max(P))$ space.

## Common mistakes
- Summing the largest $k$ elements instead of the smallest $k$ elements (maximizing rather than minimizing).
- Off-by-one errors in summing: looping up to $k$ instead of $k - 1$ (0-indexed).
- Modifying the input array in place when the caller requires const inputs.
