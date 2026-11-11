# verify: skip-stress
from typing import List

class Solution:
    def maximalSquare(self, matrix: List[List[int]]) -> int:
        R, C = len(matrix), len(matrix[0])
        dp = [[0] * (C + 1) for _ in range(R + 1)]
        best = 0
        for i in range(1, R + 1):
            for j in range(1, C + 1):
                if matrix[i - 1][j - 1] == 1:
                    dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
                    best = max(best, dp[i][j])
        return best * best