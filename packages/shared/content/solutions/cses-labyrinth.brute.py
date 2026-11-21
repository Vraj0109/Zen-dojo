from typing import List
from collections import deque

class Solution:
    def labyrinth(self, grid: List[str]) -> int:
        n, m = len(grid), len(grid[0])
        sr = sc = tr = tc = -1
        for i in range(n):
            for j in range(m):
                if grid[i][j] == 'A':
                    sr, sc = i, j
                elif grid[i][j] == 'B':
                    tr, tc = i, j
        if sr == -1 or tr == -1:
            return -1

        dist = [[-1] * m for _ in range(n)]
        dist[sr][sc] = 0
        q = deque([(sr, sc)])
        dr = [-1, 1, 0, 0]
        dc = [0, 0, -1, 1]
        while q:
            r, c = q.popleft()
            if r == tr and c == tc:
                return dist[r][c]
            for k in range(4):
                nr, nc = r + dr[k], c + dc[k]
                if 0 <= nr < n and 0 <= nc < m and grid[nr][nc] != '#' and dist[nr][nc] == -1:
                    dist[nr][nc] = dist[r][c] + 1
                    q.append((nr, nc))
        return -1
