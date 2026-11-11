# verify: skip-stress
from typing import List
from collections import deque

class Solution:
    def updateMatrix(self, mat: List[List[int]]) -> List[List[int]]:
        r, c = len(mat), len(mat[0])
        dist = [[-1] * c for _ in range(r)]
        q = deque()
        for i in range(r):
            for j in range(c):
                if mat[i][j] == 0:
                    dist[i][j] = 0
                    q.append((i, j))
        dx = [1, -1, 0, 0]
        dy = [0, 0, 1, -1]
        while q:
            x, y = q.popleft()
            for d in range(4):
                nx, ny = x + dx[d], y + dy[d]
                if 0 <= nx < r and 0 <= ny < c and dist[nx][ny] == -1:
                    dist[nx][ny] = dist[x][y] + 1
                    q.append((nx, ny))
        return dist