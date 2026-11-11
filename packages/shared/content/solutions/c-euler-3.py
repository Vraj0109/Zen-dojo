class Solution:
    def largestPrimeFactor(self, n: int) -> int:
        best = 1
        d = 2
        while d * d <= n:
            while n % d == 0:
                best = d
                n //= d
            d += 1
        return n if n > 1 else best
