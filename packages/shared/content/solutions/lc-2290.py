# verify: skip-stress
from typing import List
from collections import deque

class Solution:
    def minimumObstacles(self, grid: List[List[int]]) -> int:
        r, c = len(grid), len(grid[0])
        dist = [[float('inf')] * c for _ in range(r)]
        dist[0][0] = 0
        dq = deque([(0, 0)])
        dx = [1, -1, 0, 0]
        dy = [0, 0, 1, -1]
        while dq:
            x, y = dq.popleft()
            for k in range(4):
                nx, ny = x + dx[k], y + dy[k]
                if 0 <= nx < r and 0 <= ny < c:
                    w = grid[nx][ny]
                    if dist[x][y] + w < dist[nx][ny]:
                        dist[nx][ny] = dist[x][y] + w
                        if w == 0:
                            dq.appendleft((nx, ny))
                        else:
                            dq.append((nx, ny))
        return dist[r - 1][c - 1]