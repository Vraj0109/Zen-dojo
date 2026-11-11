from typing import List

class Solution:
    def mexGrid(self, n: int) -> List[List[int]]:
        g = [[0] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                used = [False] * (2 * n + 2)
                for k in range(j):
                    used[g[i][k]] = True
                for k in range(i):
                    used[g[k][j]] = True
                m = 0
                while used[m]:
                    m += 1
                g[i][j] = m
        return g
