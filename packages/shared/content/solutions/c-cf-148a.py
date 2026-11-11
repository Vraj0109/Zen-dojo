class Solution:
    def countDamagedDragons(self, k: int, l: int, m: int, n: int, d: int) -> int:
        return sum(1 for i in range(1, d + 1) if i % k == 0 or i % l == 0 or i % m == 0 or i % n == 0)
