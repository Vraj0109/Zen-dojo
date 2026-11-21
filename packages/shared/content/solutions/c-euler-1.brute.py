class Solution:
    def sumOfMultiples(self, limit: int, a: int, b: int) -> int:
        total = 0
        for i in range(1, limit):
            if i % a == 0 or i % b == 0:
                total += i
        return total
