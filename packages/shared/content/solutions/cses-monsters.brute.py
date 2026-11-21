from typing import List
from collections import deque

class Solution:
    def monsters(self, grid: List[str]) -> int:
        n, m = len(grid), len(grid[0])
        INF = 10**9
        m_dist = [[INF] * m for _ in range(n)]
        p_dist = [[INF] * m for _ in range(n)]
        q = deque()
        pr = pc = -1
        for i in range(n):
            for j in range(m):
                if grid[i][j] == 'M':
                    m_dist[i][j] = 0
                    q.append((i, j))
                elif grid[i][j] == 'A':
                    pr, pc = i, j

        dr = [-1, 1, 0, 0]
        dc = [0, 0, -1, 1]
        while q:
            r, c = q.popleft()
            for k in range(4):
                nr, nc = r + dr[k], c + dc[k]
                if 0 <= nr < n and 0 <= nc < m and grid[nr][nc] != '#' and m_dist[nr][nc] == INF:
                    m_dist[nr][nc] = m_dist[r][c] + 1
                    q.append((nr, nc))

        if pr == -1:
            return -1

        p_dist[pr][pc] = 0
        q = deque([(pr, pc)])
        while q:
            r, c = q.popleft()
            if r == 0 or r == n - 1 or c == 0 or c == m - 1:
                return p_dist[r][c]
            for k in range(4):
                nr, nc = r + dr[k], c + dc[k]
                if 0 <= nr < n and 0 <= nc < m and grid[nr][nc] != '#' and p_dist[nr][nc] == INF:
                    if p_dist[r][c] + 1 < m_dist[nr][nc]:
                        p_dist[nr][nc] = p_dist[r][c] + 1
                        q.append((nr, nc))
        return -1
