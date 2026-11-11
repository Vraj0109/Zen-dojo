class Solution:
    def sumOfMultiples(self, limit: int, a: int, b: int) -> int:
        from math import gcd
        def f(limit: int, d: int) -> int:
            m = (limit - 1) // d
            return d * m * (m + 1) // 2
        l = a // gcd(a, b) * b
        return f(limit, a) + f(limit, b) - f(limit, l)
