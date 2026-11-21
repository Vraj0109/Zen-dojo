class Solution:
    def requiredSubstring(self, n: int, pattern: str) -> int:
        MOD = 10**9 + 7
        if n <= 4:
            count = 0
            cur = []

            def backtrack():
                nonlocal count
                if len(cur) == n:
                    if pattern in "".join(cur):
                        count = (count + 1) % MOD
                    return
                for code in range(ord('A'), ord('Z') + 1):
                    cur.append(chr(code))
                    backtrack()
                    cur.pop()

            backtrack()
            return count

        m = len(pattern)
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

        for _ in range(n):
            next_dp = [0] * m
            for state in range(m):
                if not dp[state]:
                    continue
                for c in range(26):
                    nxt = aut[state][c]
                    if nxt < m:
                        next_dp[nxt] = (next_dp[nxt] + dp[state]) % MOD
            dp = next_dp

        total = pow(26, n, MOD)
        without = sum(dp) % MOD
        return (total - without + MOD) % MOD
