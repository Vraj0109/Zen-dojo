---
id: abc163-c
pattern: cses-atcoder
difficulty: medium
optimal: "O(n) time, O(n) space"
reviewed: false
---

## Clarify first
- How are employees structured? There are $n$ employees numbered 1 to $n$.
- Who is employee 1? Employee 1 is the company head and has no boss.
- How is the management hierarchy given? An array $a$ of length $n - 1$. For each employee $i$ from 2 to $n$, their immediate boss is $a[i - 2]$ (where $a[i - 2] < i$).
- What should be returned? A list/array of length $n$ where the $k$-th entry (representing employee $k + 1$) is the number of employees whose *immediate* boss is employee $k + 1$ (the count of direct reports).
- What are the constraints? $2 \le n \le 200,000$.

## Examples to say out loud
- Consider $n = 5$ and $a = [1, 1, 2, 2]$.
  - Employee 2 reports to 1.
  - Employee 3 reports to 1.
  - Employee 4 reports to 2.
  - Employee 5 reports to 2.
  Tallying direct reports:
  - Employee 1: has 2 direct reports (employees 2 and 3).
  - Employee 2: has 2 direct reports (employees 4 and 5).
  - Employee 3: has 0 direct reports.
  - Employee 4: has 0 direct reports.
  - Employee 5: has 0 direct reports.
  Result: `[2, 2, 0, 0, 0]`.
- Consider $n = 2$ and $a = [1]$.
  Employee 2 reports to 1.
  Employee 1 has 1 report, employee 2 has 0 $\to$ result is `[1, 0]`.

## Brute force
A naive approach would iterate through each employee $k \in [1, n]$, and for each employee, iterate through the entire array $a$ to count how many times $k$ appears. This nested approach takes $O(n \times (n - 1)) = O(n^2)$ time. For $n = 200,000$, $O(n^2)$ is $4 \times 10^{10}$ operations and will time out. Counting frequencies in an array achieves optimal $O(n)$ time.

## The key observation
Each entry in $a$ represents one employee's boss. Specifically, if $a[j] = b$, it means employee $b$ has one direct report.
Therefore, the number of direct reports for each employee $b \in [1, n]$ is simply the frequency of $b$ in the array $a$.
We allocate an array `cnt` of size $n$ initialized to 0, iterate over all values $b \in a$, and increment `cnt[b - 1]++`.

## Optimal approach
1. Let $n = a.\text{length} + 1$.
2. Allocate an array `cnt` of size $n$ filled with 0.
3. For each boss ID $b$ in array $a$:
   - Increment `cnt[b - 1]++` (using 0-based indexing for employee $b$).
4. Return `cnt`.
5. Complexity:
   - Time Complexity: $O(n)$, since we iterate over the $n - 1$ elements of $a$ once.
   - Space Complexity: $O(n)$ auxiliary space to store the direct report counts for the $n$ employees.

## Code walkthrough
- `vector<int> cnt(a.size() + 1, 0);`: Frequency table of size $n = |a| + 1$ initialized to zero.
- `for (int b : a) cnt[b - 1]++;`: For each boss specified in the hierarchy, increment their direct subordinate count.
- `return cnt;`: Return the array of report counts.

## Test it out loud
- Test 1: $a = [1] \to n = 2 \to$ `cnt[0] = 1, cnt[1] = 0` $\to [1, 0]$.
- Test 2: $a = [1, 1] \to n = 3 \to$ employee 1 appears twice $\to [2, 0, 0]$.
- Test 3: $a = [1, 2] \to$ employee 1 appears once, employee 2 appears once $\to [1, 1, 0]$.
- Test 4: $a = [1, 1, 1, 1] \to n = 5 \to [4, 0, 0, 0, 0]$.

## Follow-ups
- How would you find the total number of subordinates (both direct and indirect)?
  This represents tree sub-tree sizes. Since $a[i] < i + 1$, the tree is topologically sorted by employee indices. We can initialize `size[i] = 1` for all employees and sweep backward from $n$ down to 2, adding `size[i]` to `size[a[i - 2]]` in $O(n)$ time without recursion.
- How would you construct the tree adjacency list?
  Maintain an array of lists `adj[n]`, where `adj[a[i - 2] - 1].push_back(i)`.

## Common mistakes
- Off-by-one indexing error between 1-based employee IDs and 0-based array indices: writing `cnt[b]` instead of `cnt[b - 1]` or sizing the array to $n - 1$ instead of $n$.
- Forgetting that employee 1 is never listed in $a$ because employee 1 has no boss, but employee 1 must still have an entry in the returned result.
