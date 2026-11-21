class Solution:
    def diceCombinations(self, n: int) -> int:
        MOD = 1000000007
        dp = [0] * (n + 1)
        dp[0] = 1
        for i in range(1, n + 1):
            s = 0
            for d in range(1, 7):
                if i >= d:
                    s += dp[i - d]
            dp[i] = s % MOD
        return dp[n]
