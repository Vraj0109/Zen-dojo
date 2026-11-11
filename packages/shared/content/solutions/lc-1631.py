# verify: skip-stress
from typing import List
import heapq

class Solution:
    def minimumEffortPath(self, heights: List[List[int]]) -> int:
        r, c = len(heights), len(heights[0])
        dist = [[float('inf')] * c for _ in range(r)]
        dist[0][0] = 0
        pq = [(0, 0, 0)]
        dx = [1, -1, 0, 0]
        dy = [0, 0, 1, -1]
        while pq:
            d, x, y = heapq.heappop(pq)
            if d > dist[x][y]:
                continue
            if x == r - 1 and y == c - 1:
                return d
            for k in range(4):
                nx, ny = x + dx[k], y + dy[k]
                if 0 <= nx < r and 0 <= ny < c:
                    nd = max(d, abs(heights[nx][ny] - heights[x][y]))
                    if nd < dist[nx][ny]:
                        dist[nx][ny] = nd
                        heapq.heappush(pq, (nd, nx, ny))
        return 0