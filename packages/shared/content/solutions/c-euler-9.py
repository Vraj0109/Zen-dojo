class Solution:
    def tripletProduct(self, p: int) -> int:
        best = -1
        for a in range(1, p // 3 + 1):
            num = p * (p - 2 * a)
            den = 2 * (p - a)
            if num % den != 0:
                continue
            b = num // den
            c = p - a - b
            if a < b < c and a * a + b * b == c * c:
                best = max(best, a * b * c)
        return best
