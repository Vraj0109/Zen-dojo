# verify: skip-stress
from typing import List

class Solution:
    def forestQueriesII(self, forest: List[str], queries: List[List[int]]) -> List[int]:
        n = len(forest)
        t = [[0] * (n + 1) for _ in range(n + 1)]
        g = [[0] * (n + 1) for _ in range(n + 1)]
        for i in range(1, n + 1):
            row = forest[i - 1]
            for j in range(1, n + 1):
                if row[j - 1] == '*':
                    g[i][j] = 1
                    t[i][j] = 1
        for i in range(1, n + 1):
            for j in range(1, n + 1):
                jj = j + (j & -j)
                if jj <= n:
                    t[i][jj] += t[i][j]
        for i in range(1, n + 1):
            ii = i + (i & -i)
            if ii <= n:
                for j in range(1, n + 1):
                    t[ii][j] += t[i][j]

        def upd(y: int, x: int, v: int) -> None:
            i = y
            while i <= n:
                j = x
                while j <= n:
                    t[i][j] += v
                    j += j & -j
                i += i & -i

        def pre(y: int, x: int) -> int:
            s = 0
            i = y
            while i > 0:
                j = x
                while j > 0:
                    s += t[i][j]
                    j -= j & -j
                i -= i & -i
            return s

        ans = []
        for q in queries:
            if q[0] == 1:
                y, x = q[1], q[2]
                upd(y, x, -1 if g[y][x] else 1)
                g[y][x] ^= 1
            else:
                y1, x1, y2, x2 = q[1], q[2], q[3], q[4]
                ans.append(pre(y2, x2) - pre(y1 - 1, x2) - pre(y2, x1 - 1) + pre(y1 - 1, x1 - 1))
        return ans
