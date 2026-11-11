class Solution:
    def evenFibonacciSum(self, limit: int) -> int:
        a, b, total = 1, 2, 0
        while a <= limit:
            if a % 2 == 0:
                total += a
            a, b = b, a + b
        return total
