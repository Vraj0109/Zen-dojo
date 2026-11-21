from typing import List

class Solution:
    def coinCombinationsII(self, coins: List[int], target: int) -> int:
        MOD = 1000000007
        dp = [0] * (target + 1)
        dp[0] = 1
        for c in coins:
            for i in range(c, target + 1):
                dp[i] = (dp[i] + dp[i - c]) % MOD
        return dp[target]
