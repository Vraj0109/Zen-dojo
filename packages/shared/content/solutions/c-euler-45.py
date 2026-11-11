import math

class Solution:
    def nextTriPentHex(self, after: int) -> int:
        def is_pent(x: int) -> bool:
            d = 1 + 24 * x
            r = math.isqrt(d)
            return r * r == d and (1 + r) % 6 == 0

        n = 1
        while True:
            h = n * (2 * n - 1)
            if h > after and is_pent(h):
                return h
            n += 1
