class Solution:
    def spiralDiagonals(self, side: int) -> int:
        total = 1
        for s in range(3, side + 1, 2):
            total += 4 * s * s - 6 * (s - 1)
        return total
