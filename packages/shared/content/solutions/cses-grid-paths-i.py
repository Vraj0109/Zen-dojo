from typing import List

class Solution:
    def gridPaths(self, grid: List[str]) -> int:
        n = len(grid)
        if n == 0 or grid[0][0] == '*' or grid[n - 1][n - 1] == '*':
            return 0
        MOD = 1000000007
        dp = [0] * n
        dp[0] = 1
        for r in range(n):
            for c in range(n):
                if grid[r][c] == '*':
                    dp[c] = 0
                elif c > 0:
                    dp[c] = (dp[c] + dp[c - 1]) % MOD
        return dp[n - 1]
