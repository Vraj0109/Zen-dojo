class Solution:
    def doubleBasePalindromes(self, limit: int, base: int) -> int:
        def pal(v: int, b: int) -> bool:
            d = []
            while v > 0:
                d.append(v % b)
                v //= b
            return d == d[::-1]

        total = 0
        for h in range(1, 100000):
            for odd in (0, 1):
                v = h
                t = h // 10 if odd else h
                while t > 0:
                    v = v * 10 + t % 10
                    t //= 10
                if v < limit and pal(v, base):
                    total += v
        return total
