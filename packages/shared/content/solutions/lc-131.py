# verify: skip-stress
from typing import List

class Solution:
    def partition(self, s: str) -> List[List[str]]:
        n = len(s)
        pal = [[False] * n for _ in range(n)]
        for i in range(n - 1, -1, -1):
            for j in range(i, n):
                pal[i][j] = (s[i] == s[j]) and (j - i < 2 or pal[i + 1][j - 1])
        out = []
        cur = []
        def go(start):
            if start == n:
                out.append(list(cur))
                return
            for end in range(start, n):
                if not pal[start][end]:
                    continue
                cur.append(s[start:end + 1])
                go(end + 1)
                cur.pop()
        go(0)
        return out