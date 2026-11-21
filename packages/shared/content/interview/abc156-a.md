---
id: abc156-a
pattern: cses-atcoder
difficulty: medium
optimal: "O(1) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What are the inputs? An integer $n$ representing the number of contests participated in, and an integer $r$ representing the displayed/shown rating.
- How is the shown rating determined from the true rating?
  - If a user has participated in 10 or more contests ($n \ge 10$), the displayed rating is identical to the true rating: $R_{\text{display}} = R_{\text{true}}$.
  - If a user has participated in fewer than 10 contests ($n < 10$), the displayed rating is penalized: $R_{\text{display}} = R_{\text{true}} - 100 \times (10 - n)$.
- What is being returned? The user's true rating ($R_{\text{true}}$).
- What are the constraints? $1 \le n \le 100$ and $0 \le r \le 4111$.

## Examples to say out loud
- Consider $n = 2$ and $r = 2919$.
  Since $n < 10$, the penalty applied was $100 \times (10 - 2) = 100 \times 8 = 800$.
  The true rating is $r + 800 = 2919 + 800 = 3719$.
  Result: 3719.
- Consider $n = 22$ and $r = 3051$.
  Since $n \ge 10$, no penalty was applied. The true rating is simply $r = 3051$.
  Result: 3051.
- Edge case: $n = 10, r = 100 \to n \ge 10$, returns 100.
- Edge case: $n = 9, r = 100 \to n < 10$, penalty was $100 \times (10 - 9) = 100 \to$ returns $100 + 100 = 200$.

## Brute force
Because the formula directly maps between $R_{\text{display}}$ and $R_{\text{true}}$, there is no iterative or brute force simulation required. Evaluating a single conditional branch takes $O(1)$ time, which is already optimal.

## The key observation
Rearranging the rating formula to solve for $R_{\text{true}}$:
- Case 1 ($n \ge 10$):
  $R_{\text{true}} = r$.
- Case 2 ($n < 10$):
  $r = R_{\text{true}} - 100 \times (10 - n) \implies R_{\text{true}} = r + 100 \times (10 - n)$.
A simple ternary expression `n >= 10 ? r : r + 100 * (10 - n)` solves the problem in constant time.

## Optimal approach
1. Check if $n \ge 10$.
2. If true, return $r$.
3. If false, return $r + 100 \times (10 - n)$.
4. Complexity:
   - Time Complexity: $O(1)$, executing a single comparison and at most two arithmetic operations.
   - Space Complexity: $O(1)$, using no additional memory.

## Code walkthrough
- `int trueRating(int n, int r)`: Function accepting contest count $n$ and shown rating $r$.
- `return n >= 10 ? r : r + 100 * (10 - n);`: Branch on whether the user has reached the 10-contest threshold; apply inverse formula if below 10.

## Test it out loud
- Test 1: $n = 1, r = 0 \to 0 + 100 \times (10 - 1) = 900$.
- Test 2: $n = 9, r = 100 \to 100 + 100 \times 1 = 200$.
- Test 3: $n = 10, r = 100 \to 100$.
- Test 4: $n = 11, r = 4111 \to 4111$.
- Test 5: $n = 5, r = 3000 \to 3000 + 100 \times 5 = 3500$.

## Follow-ups
- Could this be written without a conditional statement?
  Yes, using $\max$: $R_{\text{true}} = r + 100 \times \max(0, 10 - n)$. When $n \ge 10$, $\max(0, 10 - n) = 0$, adding nothing.
- Why does competitive programming use rating penalties for beginners?
  To prevent new users from prematurely displaying inflated ratings based on a few lucky early contests, gradually revealing their true rating as their sample size grows to 10 contests.

## Common mistakes
- Subtracting the penalty instead of adding it (e.g. `r - 100 * (10 - n)`). The displayed rating was reduced, so the true rating is higher.
- Applying the formula when $n \ge 10$, resulting in a negative penalty (e.g. for $n = 12$, $100 \times (10 - 12) = -200$).
