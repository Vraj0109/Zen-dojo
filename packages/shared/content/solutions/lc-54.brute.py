from typing import List

class Solution:
    def spiralOrder(self, matrix: List[List[int]]) -> List[int]:
        if not matrix or not matrix[0]:
            return []
        m, n = len(matrix), len(matrix[0])
        visited = [[False] * n for _ in range(m)]
        res = []
        dr = [0, 1, 0, -1]
        dc = [1, 0, -1, 0]
        r, c, d = 0, 0, 0
        for _ in range(m * n):
            res.append(matrix[r][c])
            visited[r][c] = True
            nr, nc = r + dr[d], c + dc[d]
            if not (0 <= nr < m and 0 <= nc < n and not visited[nr][nc]):
                d = (d + 1) % 4
                nr, nc = r + dr[d], c + dc[d]
            r, c = nr, nc
        return res
