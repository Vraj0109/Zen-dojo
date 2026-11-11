# verify: skip-stress
class Solution:
    def rectangleCutting(self, a: int, b: int) -> int:
        dp = [[0] * (b + 1) for _ in range(a + 1)]
        for w in range(1, a + 1):
            for h in range(1, b + 1):
                if w == h:
                    dp[w][h] = 0
                    continue
                best = 10**9
                for k in range(1, w):
                    val = dp[k][h] + dp[w - k][h] + 1
                    if val < best:
                        best = val
                for k in range(1, h):
                    val = dp[w][k] + dp[w][h - k] + 1
                    if val < best:
                        best = val
                dp[w][h] = best
        return dp[a][b]
