class Solution:
    def trailingZeros(self, n: int) -> int:
        count = 0
        p = 5
        while p <= n:
            count += n // p
            p *= 5
        return count
