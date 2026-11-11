class Solution:
    def kthNotDivisible(self, n: int, k: int) -> int:
        return k + (k - 1) // (n - 1)
