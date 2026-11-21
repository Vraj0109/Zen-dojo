class Solution:
    def isMatch(self, s: str, p: str) -> bool:
        def dfs(i: int, j: int) -> bool:
            if j == len(p):
                return i == len(s)
            if i == len(s):
                return all(c == '*' for c in p[j:])

            if p[j] == '*':
                return dfs(i, j + 1) or dfs(i + 1, j)
            elif p[j] == '?' or p[j] == s[i]:
                return dfs(i + 1, j + 1)
            return False

        return dfs(0, 0)
