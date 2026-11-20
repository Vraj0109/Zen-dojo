---
id: cses-concert-tickets
pattern: cses-sorting-and-searching
difficulty: medium
optimal: "O((n + m) \log n) time and O(n) space"
reviewed: false
---

## Clarify first
- How are ticket requests processed? Customers arrive sequentially one by one in the order of `maxPrices`.
- Which ticket is assigned to a customer? The most expensive available ticket whose price is $\le \text{maxPrice}$.
- What happens once a ticket is bought? That ticket is consumed and removed from circulation.
- What should be assigned if no ticket exists within the customer's budget? Assign -1.
- What are the constraints? $1 \le n, m \le 200000$ and ticket prices/budgets can be up to $10^9$.

## Examples to say out loud
- Consider `tickets = [5, 3, 7, 8, 5]` and `maxPrices = [4, 8, 3]`:
  - Available tickets: $\{3, 5, 5, 7, 8\}$.
  - Customer 1 (budget 4): Largest ticket $\le 4$ is 3. Customer 1 pays 3. Remove 3.
  - Remaining tickets: $\{5, 5, 7, 8\}$.
  - Customer 2 (budget 8): Largest ticket $\le 8$ is 8. Customer 2 pays 8. Remove 8.
  - Remaining tickets: $\{5, 5, 7\}$.
  - Customer 3 (budget 3): Largest ticket $\le 3$ does not exist (all remaining are $\ge 5$). Customer 3 gets -1.
  - Result: `[3, 8, -1]`.

## Brute force
A brute force approach would search linearly through an array of available tickets for each customer, finding the maximum price $\le \text{budget}$, and removing that ticket by shifting or marking it used. With $n, m \le 200000$, performing $m$ linear searches takes $O(n \times m) \approx 4 \times 10^{10}$ operations, causing a severe Time Limit Exceeded. A balanced binary search tree or multiset reduces each customer query and deletion to $O(\log n)$ time.

## The key observation
For each incoming customer with maximum price $p$, we need the dynamic predecessor: the largest available ticket value $t \le p$.
In a self-balancing binary search tree (such as `std::multiset` in C++ or `TreeMap` in Java):
- Querying `upper_bound(p)` finds the first ticket strictly greater than $p$.
- If `upper_bound(p)` is `begin()`, every ticket in the tree is strictly greater than $p$, so no valid ticket exists (return -1).
- Otherwise, decrementing the iterator gives the largest ticket $\le p$.
- Erasing that exact iterator removes one copy of the ticket in $O(\log n)$ time without affecting duplicates.

## Optimal approach
1. Populate a multiset (or frequency map) with all initial ticket prices.
2. Allocate a result array of size $m$.
3. For each customer price $p$ in `maxPrices`:
   - Query `it = ms.upper_bound(p)`.
   - If `it == ms.begin()`, append -1.
   - Otherwise:
     - Decrement iterator: `--it`.
     - Append `*it` to the result list.
     - Erase the ticket at iterator `it` from the multiset: `ms.erase(it)`.
4. Return the result array.

Complexity:
- Time: $O((n + m) \log n)$ because inserting $n$ tickets takes $O(n \log n)$ and processing $m$ queries and deletions takes $O(m \log n)$.
- Space: $O(n)$ to store ticket elements in the multiset.

## Code walkthrough
- `multiset<int> ms(tickets.begin(), tickets.end())`: Organizes ticket prices in a self-balancing red-black tree allowing duplicates.
- `auto it = ms.upper_bound(p)`: Finds the first element strictly exceeding $p$ in $O(\log n)$ time.
- `if (it == ms.begin()) ans.push_back(-1)`: If even the smallest element exceeds $p$, the customer cannot afford any ticket.
- `--it`: Shifts iterator back to the largest ticket satisfying price $\le p$.
- `ans.push_back(*it)`: Records the transaction price.
- `ms.erase(it)`: Crucial: erases by iterator, removing only one instance rather than all identical prices.

## Test it out loud
- Test case $1$: `tickets = [1, 2, 3]`, `maxPrices = [1, 2, 3]`: Exact matches, returns `[1, 2, 3]`.
- Test case $2$: `tickets = [10, 20, 30]`, `maxPrices = [5, 5, 5]`: All budgets below minimum ticket price, returns `[-1, -1, -1]`.
- Test case $3$: `tickets = [5, 5, 5, 5]`, `maxPrices = [5, 5, 5, 5, 5]`: Four customers buy at 5, fifth customer gets -1. Returns `[5, 5, 5, 5, -1]`.
- Test case $4$: `tickets = [1000000000]`, `maxPrices = [1000000000]`: Works up to $10^9$ without overflow.

## Follow-ups
- Can this be solved with a Fenwick tree or Segment Tree? Yes, coordinate-compress all unique ticket prices, build a segment tree over price frequencies, and query the maximum prefix index with non-zero count in $O(\log U)$ time.
- What if ticket prices were given as static intervals? We could use a disjoint-set union (DSU) to jump over exhausted price slots.

## Common mistakes
- Erasing by value instead of iterator: Calling `ms.erase(val)` in C++ erases all duplicate occurrences of `val`, deleting multiple tickets at once. Calling `ms.erase(it)` by iterator removes only the single purchased ticket.
- Using an array with binary search: Calling `std::lower_bound` on a `std::vector` is $O(\log n)$, but deleting an element from a vector requires $O(n)$ shifts, leading to an overall $O(m \times n)$ runtime and TLE.

## Further reading
- [Red-Black Tree on Wikipedia](https://en.wikipedia.org/wiki/Red%E2%80%93black_tree)
