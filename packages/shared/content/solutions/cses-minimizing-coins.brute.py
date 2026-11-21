from typing import List

class Solution:
    def minimizingCoins(self, coins: List[int], target: int) -> int:
        INF = 10**9
        dp = [INF] * (target + 1)
        dp[0] = 0
        for i in range(1, target + 1):
            for c in coins:
                if i >= c and dp[i - c] != INF:
                    if dp[i - c] + 1 < dp[i]:
                        dp[i] = dp[i - c] + 1
        return -1 if dp[target] >= INF else dp[target]
