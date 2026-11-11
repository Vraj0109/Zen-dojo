class Solution:
    def diceCombinations(self, n: int) -> int:
        MOD = 1000000007
        dp = [0] * (n + 1)
        dp[0] = 1
        for i in range(1, n + 1):
            for d in range(1, 7):
                if i >= d:
                    dp[i] = (dp[i] + dp[i - d]) % MOD
        return dp[n]
