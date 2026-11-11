# verify: skip-stress
class Solution:
    def myPow(self, x: float, n: int) -> float:
        e = n
        neg = e < 0
        if neg:
            e = -e
        result = 1.0
        base = x
        while e > 0:
            if e & 1:
                result *= base
            base *= base
            e >>= 1
        return 1.0 / result if neg else result