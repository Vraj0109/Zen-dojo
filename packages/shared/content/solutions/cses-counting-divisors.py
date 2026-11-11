class Solution:
    def countingDivisors(self, x: int) -> int:
        count = 0
        d = 1
        while d * d <= x:
            if x % d == 0:
                count += 1 if d * d == x else 2
            d += 1
        return count
