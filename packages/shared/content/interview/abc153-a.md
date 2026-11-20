---
id: abc153-a
pattern: cses-atcoder
difficulty: medium
optimal: "O(1) time, O(1) space"
reviewed: false
---

## Clarify first
- What are the inputs? An integer $h$ representing a monster's initial health points, and an integer $a$ representing the damage inflicted by each attack.
- What constitutes defeating the monster? The monster is defeated when its remaining health becomes less than or equal to 0 ($\le 0$).
- What are the constraints on $h$ and $a$? $1 \le h, a \le 10,000$.
- What should be returned? The minimum number of attacks required to reduce health to 0 or below.

## Examples to say out loud
- Consider $h = 10$ and $a = 4$.
  - Attack 1: health becomes $10 - 4 = 6$.
  - Attack 2: health becomes $6 - 4 = 2$.
  - Attack 3: health becomes $2 - 4 = -2 \le 0$.
  Total attacks needed: 3.
  Note that $\lceil 10 / 4 \rceil = \lceil 2.5 \rceil = 3$.
- Consider $h = 1$ and $a = 10000$.
  One attack does 10000 damage, reducing health to $-9999 \le 0 \to$ returns 1.
- Consider $h = 10000$ and $a = 1$.
  $10000$ attacks needed $\to$ returns 10000.

## Brute force
A naive approach simulates the attacks in a `while` loop: decrement $h \leftarrow h - a$ and count how many iterations occur until $h \le 0$. While this runs in $O(h / a)$ time (at most 10,000 iterations), running a loop is unnecessary when integer division provides the ceiling in $O(1)$ time.

## The key observation
Each attack inflicts $a$ damage. The number of attacks needed is the mathematical ceiling of the ratio:
$\text{attacks} = \lceil \frac{h}{a} \rceil$.
In integer arithmetic where standard division truncates towards zero (floor division), the ceiling division of two positive integers can be computed without floating-point conversion using:
$\lceil \frac{h}{a} \rceil = \lfloor \frac{h + a - 1}{a} \rfloor$.
This formula gives the exact answer using a single constant-time arithmetic operation.

## Optimal approach
1. Compute the ceiling division using integer arithmetic: `(h + a - 1) / a`.
2. Return the resulting integer.
3. Complexity:
   - Time Complexity: $O(1)$, exactly one addition, one subtraction, and one division.
   - Space Complexity: $O(1)$, requiring no extra storage.

## Code walkthrough
- `int attacksNeeded(int h, int a)`: Function signature taking health $h$ and damage $a$.
- `(h + a - 1) / a`: Add $(a - 1)$ to numerator to shift values so integer floor division behaves as ceiling division.
- `return ...`: Return the computed attack count.

## Test it out loud
- Test 1: $h = 1, a = 1 \to (1 + 1 - 1) / 1 = 1 / 1 = 1$.
- Test 2: $h = 10, a = 4 \to (10 + 3) / 4 = 13 / 4 = 3$.
- Test 3: $h = 7, a = 7 \to (7 + 6) / 7 = 13 / 7 = 1$.
- Test 4: $h = 10000, a = 9999 \to (10000 + 9998) / 9999 = 19998 / 9999 = 2$.

## Follow-ups
- Why avoid floating-point `ceil((double)h / a)`?
  Floating-point operations can suffer precision inaccuracies for very large integers (e.g. beyond $2^{53} \approx 9 \times 10^{15}$). The integer arithmetic formula `(h + a - 1) / a` is exact and executes in fewer CPU cycles.
- What if $h$ and $a$ can be up to $10^{18}$?
  When $h \approx 10^{18}$, $h + a - 1$ could potentially overflow a signed 64-bit integer. In that case, we can write:
  $1 + (h - 1) / a$, which avoids numerator addition overflow.

## Common mistakes
- Using standard integer division `h / a`, which truncates downward (e.g., $10 / 4 = 2$ instead of 3).
- Using floating-point casting without rounding precautions.
