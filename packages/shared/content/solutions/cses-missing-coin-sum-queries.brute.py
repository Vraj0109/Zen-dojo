class Solution:
    def missingCoinSumQueries(self, coins: list[int], queries: list[list[int]]) -> list[int]:
        ans = []
        for a, b in queries:
            sub = sorted(coins[a - 1:b])
            s = 0
            for c in sub:
                if c > s + 1:
                    break
                s += c
            ans.append(s + 1)
        return ans
