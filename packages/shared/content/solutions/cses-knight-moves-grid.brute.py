from typing import List
from collections import deque

class Solution:
    def knightMovesGrid(self, n: int) -> List[List[int]]:
        dist = [[-1] * n for _ in range(n)]
        dist[0][0] = 0
        q = deque([(0, 0)])
        moves = [(-2, -1), (-2, 1), (-1, -2), (-1, 2), (1, -2), (1, 2), (2, -1), (2, 1)]
        while q:
            r, c = q.popleft()
            for dr, dc in moves:
                nr, nc = r + dr, c + dc
                if 0 <= nr < n and 0 <= nc < n and dist[nr][nc] == -1:
                    dist[nr][nc] = dist[r][c] + 1
                    q.append((nr, nc))
        return dist
