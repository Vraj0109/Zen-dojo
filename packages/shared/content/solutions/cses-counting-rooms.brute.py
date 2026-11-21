from typing import List
from collections import deque

class Solution:
    def countingRooms(self, grid: List[str]) -> int:
        if not grid or not grid[0]:
            return 0
        n, m = len(grid), len(grid[0])
        g = [list(row) for row in grid]
        rooms = 0
        dr = [-1, 1, 0, 0]
        dc = [0, 0, -1, 1]
        for i in range(n):
            for j in range(m):
                if g[i][j] == '.':
                    rooms += 1
                    g[i][j] = '#'
                    q = deque([(i, j)])
                    while q:
                        r, c = q.popleft()
                        for k in range(4):
                            nr, nc = r + dr[k], c + dc[k]
                            if 0 <= nr < n and 0 <= nc < m and g[nr][nc] == '.':
                                g[nr][nc] = '#'
                                q.append((nr, nc))
        return rooms
