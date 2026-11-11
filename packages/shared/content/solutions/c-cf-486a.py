class Solution:
    def evalCalculatingFunction(self, n: int) -> int:
        if n % 2 == 0:
            return n // 2
        return -((n + 1) // 2)
