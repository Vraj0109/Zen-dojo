# verify: skip-stress
from typing import List

class Solution:
    def cherryPickup(self, grid: List[List[int]]) -> int:
        n = len(grid)
        NEG = -float('inf')
        dp = [[NEG] * n for _ in range(n)]
        dp[0][0] = grid[0][0]
        for t in range(1, 2 * n - 1):
            nd = [[NEG] * n for _ in range(n)]
            for r1 in range(max(0, t - (n - 1)), min(n - 1, t) + 1):
                c1 = t - r1
                if grid[r1][c1] == -1:
                    continue
                for r2 in range(max(0, t - (n - 1)), min(n - 1, t) + 1):
                    c2 = t - r2
                    if grid[r2][c2] == -1:
                        continue
                    best = NEG
                    for d1 in (0, 1):
                        for d2 in (0, 1):
                            p1, p2 = r1 - d1, r2 - d2
                            if p1 >= 0 and p2 >= 0:
                                best = max(best, dp[p1][p2])
                    if best == NEG:
                        continue
                    gain = grid[r1][c1] + (grid[r2][c2] if r1 != r2 else 0)
                    nd[r1][r2] = best + gain
            dp = nd
        return max(0, dp[n - 1][n - 1])