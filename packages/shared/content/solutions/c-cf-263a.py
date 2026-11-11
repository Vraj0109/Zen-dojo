from typing import List

class Solution:
    def beautifulMatrix(self, grid: List[List[int]]) -> int:
        for r in range(5):
            for c in range(5):
                if grid[r][c] == 1:
                    return abs(r - 2) + abs(c - 2)
        return -1
