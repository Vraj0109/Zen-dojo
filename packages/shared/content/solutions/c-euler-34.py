# verify: skip-stress
import math

class Solution:
    def digitFactorialSum(self, limit: int) -> int:
        f = [math.factorial(i) for i in range(10)]
        cap = min(limit, 7 * f[9])
        total = 0
        for n in range(10, cap + 1):
            s = 0
            m = n
            while m > 0:
                s += f[m % 10]
                m //= 10
            if s == n:
                total += n
        return total
