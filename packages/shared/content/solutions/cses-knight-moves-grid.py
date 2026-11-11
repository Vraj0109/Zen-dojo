from typing import List
from collections import deque

class Solution:
    def knightMovesGrid(self, n: int) -> List[List[int]]:
        d = [[-1] * n for _ in range(n)]
        q = deque([(0, 0)])
        d[0][0] = 0
        dx = [1, 2, 2, 1, -1, -2, -2, -1]
        dy = [2, 1, -1, -2, -2, -1, 1, 2]
        while q:
            x, y = q.popleft()
            for k in range(8):
                nx, ny = x + dx[k], y + dy[k]
                if 0 <= nx < n and 0 <= ny < n and d[nx][ny] == -1:
                    d[nx][ny] = d[x][y] + 1
                    q.append((nx, ny))
        return d
