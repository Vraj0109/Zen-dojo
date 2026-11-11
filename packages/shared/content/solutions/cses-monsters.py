from typing import List
from collections import deque

class Solution:
    def monsters(self, grid: List[str]) -> int:
        n, m = len(grid), len(grid[0])
        ar, ac = -1, -1
        mq = deque()
        mdist = [10**9] * (n * m)
        for i in range(n):
            for j in range(m):
                ch = grid[i][j]
                if ch == 'M':
                    mdist[i * m + j] = 0
                    mq.append(i * m + j)
                elif ch == 'A':
                    ar, ac = i, j

        dr = [-1, 1, 0, 0]
        dc = [0, 0, -1, 1]
        while mq:
            u = mq.popleft()
            r, c = u // m, u % m
            for k in range(4):
                nr, nc = r + dr[k], c + dc[k]
                if 0 <= nr < n and 0 <= nc < m and grid[nr][nc] != '#':
                    v = nr * m + nc
                    if mdist[v] > mdist[u] + 1:
                        mdist[v] = mdist[u] + 1
                        mq.append(v)

        if ar == 0 or ar == n - 1 or ac == 0 or ac == m - 1:
            return 0

        pdist = [-1] * (n * m)
        pq = deque([ar * m + ac])
        pdist[ar * m + ac] = 0
        while pq:
            u = pq.popleft()
            r, c = u // m, u % m
            for k in range(4):
                nr, nc = r + dr[k], c + dc[k]
                if 0 <= nr < n and 0 <= nc < m and grid[nr][nc] != '#':
                    v = nr * m + nc
                    if pdist[v] == -1 and pdist[u] + 1 < mdist[v]:
                        pdist[v] = pdist[u] + 1
                        if nr == 0 or nr == n - 1 or nc == 0 or nc == m - 1:
                            return pdist[v]
                        pq.append(v)
        return -1
