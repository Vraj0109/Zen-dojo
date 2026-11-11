from typing import List

# verify: skip-stress
class Solution:
    def wordCombinations(self, s: str, words: List[str]) -> int:
        trie = [{}]
        is_end = [False]

        for w in words:
            cur = 0
            for c in w:
                if c not in trie[cur]:
                    nxt = len(trie)
                    trie[cur][c] = nxt
                    trie.append({})
                    is_end.append(False)
                cur = trie[cur][c]
            is_end[cur] = True

        n = len(s)
        MOD = 1000000007
        dp = [0] * (n + 1)
        dp[0] = 1

        for i in range(n):
            if dp[i] == 0:
                continue
            cur = 0
            for j in range(i, n):
                c = s[j]
                if c not in trie[cur]:
                    break
                cur = trie[cur][c]
                if is_end[cur]:
                    dp[j + 1] = (dp[j + 1] + dp[i]) % MOD

        return dp[n]
