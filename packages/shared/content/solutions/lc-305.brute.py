from collections import deque
from typing import List

class Solution:
    def numIslands2(self, m: int, n: int, positions: List[List[int]]) -> List[int]:
        grid = [[0] * n for _ in range(m)]
        res = []
        dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]

        for r, c in positions:
            grid[r][c] = 1
            visited = [[False] * n for _ in range(m)]
            islands = 0
            for i in range(m):
                for j in range(n):
                    if grid[i][j] == 1 and not visited[i][j]:
                        islands += 1
                        visited[i][j] = True
                        q = deque([(i, j)])
                        while q:
                            cr, cc = q.popleft()
                            for dr, dc in dirs:
                                nr, nc = cr + dr, cc + dc
                                if 0 <= nr < m and 0 <= nc < n and grid[nr][nc] == 1 and not visited[nr][nc]:
                                    visited[nr][nc] = True
                                    q.append((nr, nc))
            res.append(islands)
        return res
