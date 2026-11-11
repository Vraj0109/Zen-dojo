class Solution:
    def borrowMoney(self, k: int, n: int, w: int) -> int:
        total = k * w * (w + 1) // 2
        return max(0, total - n)
