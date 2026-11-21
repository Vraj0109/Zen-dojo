class Solution:
    def borrowMoney(self, k: int, n: int, w: int) -> int:
        total = 0
        for i in range(1, w + 1):
            total += i * k
        return max(0, total - n)
