class Solution:
    def maxEnvelopes(self, envelopes: list[list[int]]) -> int:
        if not envelopes:
            return 0
        env = sorted(envelopes, key=lambda x: (x[0], x[1]))
        n = len(env)
        dp = [1] * n
        max_len = 1
        for i in range(n):
            for j in range(i):
                if env[j][0] < env[i][0] and env[j][1] < env[i][1]:
                    if dp[j] + 1 > dp[i]:
                        dp[i] = dp[j] + 1
            if dp[i] > max_len:
                max_len = dp[i]
        return max_len
