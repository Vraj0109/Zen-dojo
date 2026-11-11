class Solution:
    def selfPowersTail(self, n: int, digits: int) -> int:
        m = 10 ** digits
        total = 0
        for k in range(1, n + 1):
            total = (total + pow(k, k, m)) % m
        return total
