# verify: skip-stress
class Solution:
    def requiredSubstring(self, n: int, pattern: str) -> int:
        m = len(pattern)
        MOD = 1000000007

        pi = [0] * m
        for i in range(1, m):
            j = pi[i - 1]
            while j > 0 and pattern[i] != pattern[j]:
                j = pi[j - 1]
            if pattern[i] == pattern[j]:
                j += 1
            pi[i] = j

        aut = [[0] * 26 for _ in range(m)]
        for state in range(m):
            for c in range(26):
                ch = chr(ord('A') + c)
                j = state
                while j > 0 and ch != pattern[j]:
                    j = pi[j - 1]
                if ch == pattern[j]:
                    j += 1
                aut[state][c] = j

        dp = [0] * m
        dp[0] = 1

        for step in range(n):
            next_dp = [0] * m
            for state in range(m):
                val = dp[state]
                if val == 0:
                    continue
                for c in range(26):
                    nxt = aut[state][c]
                    if nxt < m:
                        next_dp[nxt] = (next_dp[nxt] + val) % MOD
            dp = next_dp

        total = pow(26, n, MOD)
        without = sum(dp) % MOD
        return (total - without + MOD) % MOD
