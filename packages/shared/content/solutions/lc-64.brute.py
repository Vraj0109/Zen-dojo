from typing import List

class Solution:
    def minPathSum(self, grid: List[List[int]]) -> int:
        m, n = len(grid), len(grid[0])
        def dfs(r: int, c: int) -> int:
            if r == m - 1 and c == n - 1:
                return grid[r][c]
            if r >= m or c >= n:
                return 10**9
            return grid[r][c] + min(dfs(r + 1, c), dfs(r, c + 1))
        return dfs(0, 0)
