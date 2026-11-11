# verify: skip-stress
class Solution:
    def minCut(self, s: str) -> int:
        n = len(s)
        pal = [[False] * n for _ in range(n)]
        for i in range(n - 1, -1, -1):
            for j in range(i, n):
                pal[i][j] = (s[i] == s[j]) and (j - i < 2 or pal[i + 1][j - 1])
        cut = [0] * n
        for j in range(n):
            if pal[0][j]:
                cut[j] = 0
                continue
            cut[j] = j
            for i in range(1, j + 1):
                if pal[i][j]:
                    cut[j] = min(cut[j], cut[i - 1] + 1)
        return cut[n - 1]