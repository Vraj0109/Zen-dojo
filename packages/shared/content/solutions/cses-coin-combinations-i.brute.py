from typing import List

class Solution:
    def coinCombinationsI(self, coins: List[int], target: int) -> int:
        MOD = 1000000007
        dp = [0] * (target + 1)
        dp[0] = 1
        for i in range(1, target + 1):
            s = 0
            for c in coins:
                if i >= c:
                    s += dp[i - c]
            dp[i] = s % MOD
        return dp[target]
