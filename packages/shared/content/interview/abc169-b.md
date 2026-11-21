---
id: abc169-b
pattern: cses-atcoder
difficulty: medium
optimal: "O(n) time, O(1) space"
brute: same
reviewed: false
---

## Clarify first
- What is the task? Multiply all numbers in an array $a$ together.
- What is the threshold limit? If the running product exceeds $10^{15}$, the function must return $-1$.
- What if the array contains zero ($0$)? If any element in the array is 0, the final product is strictly 0, regardless of how large any other numbers are (even if earlier products would have exceeded $10^{15}$).
- What are the constraints on the array? $2 \le a.\text{length} \le 100,000$ and $0 \le a[i] \le 10^{15}$.
- Why can't we multiply numbers directly? Multiplying two numbers $\le 10^{15}$ produces up to $10^{30}$, overflowing standard 64-bit integers and wrapping around to smaller values, masking the overflow.

## Examples to say out loud
- Consider $a = [10^9, 10^6]$.
  Product is $10^9 \times 10^6 = 10^{15}$.
  $10^{15} \le 10^{15} \to$ valid $\to$ returns $10^{15}$.
- Consider $a = [10^9, 10^6, 10^9]$.
  Product would be $10^{24} > 10^{15} \to$ returns $-1$.
- Consider $a = [10^9, 10^6, 0]$.
  Even though the partial product $10^9 \times 10^6 = 10^{15}$, the presence of 0 makes the overall product 0.
  Returns 0.

## Brute force
A naive approach multiplies elements sequentially without checking for overflow. In languages with fixed-width integers, this results in undefined behavior or silent integer wrap-around. In Python with arbitrary precision, multiplying 100,000 large numbers could lead to numbers with millions of digits, consuming excessive time and memory.

## The key observation
Two crucial insights ensure both correctness and optimal speed:
1. Check for 0 first:
   If any $a[i] == 0$, the overall product is guaranteed to be 0. We can scan the array once upfront; if 0 is found, return 0 immediately.
2. Overflow prevention via division:
   To check whether $\text{cur} \times x > \text{LIM}$ without actually computing $\text{cur} \times x$ (which could overflow):
   $\text{cur} \times x > \text{LIM} \iff \text{cur} > \lfloor \frac{\text{LIM}}{x} \rfloor$ (since $x \ge 1$ after checking for zeros).
   If $\text{cur} > \text{LIM} / x$, we can immediately abort and return $-1$.

## Optimal approach
1. Define $\text{LIM} = 10^{15}$.
2. Scan array $a$ for zeros: if any $x == 0$, return 0 immediately.
3. Initialize running product `cur = 1`.
4. Iterate through each element $x$ in $a$:
   - Check overflow condition: if `cur > LIM / x`, return `-1`.
   - Update: `cur = cur * x`.
5. Return `cur`.
6. Complexity:
   - Time Complexity: $O(n)$, making at most two linear passes over the array of size $n$.
   - Space Complexity: $O(1)$, using only scalar 64-bit integer variables.

## Code walkthrough
- `const long long LIM = 1000000000000000LL;`: Threshold $10^{15}$.
- `for (long long x : a) if (x == 0) return 0;`: First pass handles zeros so division later is safe from division-by-zero.
- `if (cur > LIM / x) return -1;`: Overflow check using integer division before multiplying.
- `cur *= x;`: Safe in-place 64-bit multiplication.
- `return cur;`: Final bounded product.

## Test it out loud
- Test 1: $a = [2, 3] \to \text{cur} = 6 \le 10^{15} \to 6$.
- Test 2: $a = [0, 5] \to$ zero detected $\to 0$.
- Test 3: $a = [10^{15}, 1] \to 10^{15} \le 10^{15} / 1 \to 10^{15}$.
- Test 4: $a = [10^{15}, 2] \to 10^{15} > 10^{15} / 2 = 5 \times 10^{14} \to -1$.
- Test 5: $a = [10^9, 10^6, 0] \to$ zero check returns 0.

## Follow-ups
- Why is checking for 0 first mandatory?
  If an array has massive numbers followed by a 0 at the end (e.g. $[10^{15}, 10^{15}, 0]$), an algorithm that checks overflow greedily during iteration would return $-1$ before ever discovering the zero, giving an incorrect answer.
- What if $\text{LIM} = 10^{18}$ as in original AtCoder ABC 169 B?
  $10^{18}$ also fits inside a 64-bit signed integer (`LLONG_MAX` $\approx 9.22 \times 10^{18}$), and the identical division check `cur > 10^18 / x` applies.

## Common mistakes
- Not checking for zeros before triggering the overflow check.
- Multiplying before comparing (e.g. `if (cur * x > LIM)`), which causes 64-bit integer overflow and wraps around to negative or small numbers.
- Division by zero if applying `LIM / x` without handling $x = 0$ beforehand.
