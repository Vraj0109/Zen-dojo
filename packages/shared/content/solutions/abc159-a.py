class Solution:
    def evenPairs(self, n: int, m: int) -> int:
        return n * (n - 1) // 2 + m * (m - 1) // 2
