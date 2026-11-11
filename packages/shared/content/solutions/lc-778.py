# verify: skip-stress
from typing import List
import heapq

class Solution:
    def swimInWater(self, grid: List[List[int]]) -> int:
        n = len(grid)
        seen = [[False] * n for _ in range(n)]
        pq = [(grid[0][0], 0, 0)]
        seen[0][0] = True
        dx = [1, -1, 0, 0]
        dy = [0, 0, 1, -1]
        while pq:
            t, x, y = heapq.heappop(pq)
            if x == n - 1 and y == n - 1:
                return t
            for k in range(4):
                nx, ny = x + dx[k], y + dy[k]
                if 0 <= nx < n and 0 <= ny < n and not seen[nx][ny]:
                    seen[nx][ny] = True
                    heapq.heappush(pq, (max(t, grid[nx][ny]), nx, ny))
        return -1