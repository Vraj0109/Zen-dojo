class Solution:
    def sumSquareDifference(self, n: int) -> int:
        s = n * (n + 1) // 2
        q = n * (n + 1) * (2 * n + 1) // 6
        return s * s - q
