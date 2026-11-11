from typing import List
from collections import deque

class Solution:
    def labyrinth(self, grid: List[str]) -> int:
        n, m = len(grid), len(grid[0])
        sr, sc, tr, tc = -1, -1, -1, -1
        for i in range(n):
            for j in range(m):
                if grid[i][j] == 'A':
                    sr, sc = i, j
                elif grid[i][j] == 'B':
                    tr, tc = i, j
        if sr == -1 or tr == -1:
            return -1

        dist = [-1] * (n * m)
        dist[sr * m + sc] = 0
        q = deque([sr * m + sc])
        dr = [-1, 1, 0, 0]
        dc = [0, 0, -1, 1]
        while q:
            u = q.popleft()
            r, c = u // m, u % m
            if r == tr and c == tc:
                return dist[u]
            for k in range(4):
                nr, nc = r + dr[k], c + dc[k]
                if 0 <= nr < n and 0 <= nc < m and grid[nr][nc] != '#':
                    v = nr * m + nc
                    if dist[v] == -1:
                        dist[v] = dist[u] + 1
                        q.append(v)
        return -1
