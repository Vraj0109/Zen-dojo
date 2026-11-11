class Solution:
    def twoSetsII(self, n: int) -> int:
        total = n * (n + 1) // 2
        if total % 2 != 0:
            return 0
        target = total // 2
        MOD = 1000000007
        dp = [0] * (target + 1)
        dp[0] = 1
        for i in range(1, n):
            for j in range(target, i - 1, -1):
                dp[j] = (dp[j] + dp[j - i]) % MOD
        return dp[target]
