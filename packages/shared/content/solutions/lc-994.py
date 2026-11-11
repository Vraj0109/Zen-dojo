# verify: skip-stress
from typing import List
from collections import deque

class Solution:
    def orangesRotting(self, grid: List[List[int]]) -> int:
        r, c = len(grid), len(grid[0])
        q = deque()
        fresh = 0
        for i in range(r):
            for j in range(c):
                if grid[i][j] == 2:
                    q.append((i, j))
                elif grid[i][j] == 1:
                    fresh += 1
        minutes = 0
        dx = [1, -1, 0, 0]
        dy = [0, 0, 1, -1]
        while q and fresh > 0:
            sz = len(q)
            for _ in range(sz):
                x, y = q.popleft()
                for d in range(4):
                    nx, ny = x + dx[d], y + dy[d]
                    if 0 <= nx < r and 0 <= ny < c and grid[nx][ny] == 1:
                        grid[nx][ny] = 2
                        fresh -= 1
                        q.append((nx, ny))
            minutes += 1
        return minutes if fresh == 0 else -1