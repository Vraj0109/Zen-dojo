class Solution:
    def exponentiation(self, a: int, b: int) -> int:
        mod = 1000000007
        if b > 50_000_000:
            return pow(a, b, mod)
        res = 1
        base = a % mod
        for _ in range(b):
            res = (res * base) % mod
        return res
