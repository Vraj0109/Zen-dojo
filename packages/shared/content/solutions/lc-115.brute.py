class Solution:
    def numDistinct(self, s: str, t: str) -> int:
        def dfs(i: int, j: int) -> int:
            if j == len(t):
                return 1
            if i == len(s):
                return 0

            ways = dfs(i + 1, j)
            if s[i] == t[j]:
                ways += dfs(i + 1, j + 1)
            return ways

        return dfs(0, 0)
