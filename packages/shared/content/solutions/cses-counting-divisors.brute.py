class Solution:
    def countingDivisors(self, x: int) -> int:
        count = 0
        for d in range(1, x + 1):
            if x % d == 0:
                count += 1
        return count
