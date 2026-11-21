class Solution:
    def wordCombinations(self, s: str, words: list[str]) -> int:
        n = len(s)
        MOD = 10**9 + 7
        dp = [0] * (n + 1)
        dp[0] = 1

        for i in range(n):
            if dp[i] == 0:
                continue
            for w in words:
                length = len(w)
                if i + length <= n and s[i:i + length] == w:
                    dp[i + length] = (dp[i + length] + dp[i]) % MOD
        return dp[n]
