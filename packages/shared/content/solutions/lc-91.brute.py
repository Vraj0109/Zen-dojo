class Solution:
    def numDecodings(self, s: str) -> int:
        if not s:
            return 0
        def dfs(i: int) -> int:
            if i == len(s):
                return 1
            if s[i] == '0':
                return 0
            ways = dfs(i + 1)
            if i + 1 < len(s):
                two = int(s[i : i + 2])
                if 10 <= two <= 26:
                    ways += dfs(i + 2)
            return ways
        return dfs(0)
