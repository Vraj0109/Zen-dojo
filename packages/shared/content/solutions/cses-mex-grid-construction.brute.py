from typing import List

class Solution:
    def mexGrid(self, n: int) -> List[List[int]]:
        grid = [[0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                used = [False] * (2 * n + 5)
                for c in range(j):
                    used[grid[i][c]] = True
                for r in range(i):
                    used[grid[r][j]] = True
                mex = 0
                while used[mex]:
                    mex += 1
                grid[i][j] = mex
        return grid
