class Solution:
    def oddDigitCount(self, n: int) -> int:
        lo = 1
        total = 0
        for d in range(1, 10):
            hi = lo * 10 - 1
            if d % 2 == 1 and n >= lo:
                total += min(n, hi) - lo + 1
            lo *= 10
        return total
