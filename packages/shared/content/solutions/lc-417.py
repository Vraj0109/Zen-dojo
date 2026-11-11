# verify: skip-stress
from typing import List
from collections import deque

class Solution:
    def pacificAtlantic(self, heights: List[List[int]]) -> List[List[int]]:
        r, c = len(heights), len(heights[0])
        def fill(seen, starts):
            q = deque()
            for sx, sy in starts:
                if not seen[sx][sy]:
                    seen[sx][sy] = True
                    q.append((sx, sy))
            dx = [1, -1, 0, 0]
            dy = [0, 0, 1, -1]
            while q:
                x, y = q.popleft()
                for d in range(4):
                    nx, ny = x + dx[d], y + dy[d]
                    if 0 <= nx < r and 0 <= ny < c and not seen[nx][ny] and heights[nx][ny] >= heights[x][y]:
                        seen[nx][ny] = True
                        q.append((nx, ny))
        pac = [[False] * c for _ in range(r)]
        atl = [[False] * c for _ in range(r)]
        fill(pac, [(i, 0) for i in range(r)] + [(0, j) for j in range(c)])
        fill(atl, [(i, c - 1) for i in range(r)] + [(r - 1, j) for j in range(c)])
        out = []
        for i in range(r):
            for j in range(c):
                if pac[i][j] and atl[i][j]:
                    out.append([i, j])
        return out