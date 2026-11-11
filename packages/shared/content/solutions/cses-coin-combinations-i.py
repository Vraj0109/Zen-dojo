from typing import List

class Solution:
    def coinCombinationsI(self, coins: List[int], target: int) -> int:
        MOD = 1000000007
        dp = [0] * (target + 1)
        dp[0] = 1
        for i in range(1, target + 1):
            for c in coins:
                if i >= c:
                    dp[i] = (dp[i] + dp[i - c]) % MOD
        return dp[target]
