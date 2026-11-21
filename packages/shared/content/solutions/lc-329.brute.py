from typing import List

class Solution:
    def longestIncreasingPath(self, matrix: List[List[int]]) -> int:
        if not matrix or not matrix[0]:
            return 0
        m, n = len(matrix), len(matrix[0])
        dirs = [(1, 0), (-1, 0), (0, 1), (0, -1)]

        def dfs(r: int, c: int) -> int:
            best = 1
            for dr, dc in dirs:
                nr, nc = r + dr, c + dc
                if 0 <= nr < m and 0 <= nc < n and matrix[nr][nc] > matrix[r][c]:
                    cand = 1 + dfs(nr, nc)
                    if cand > best:
                        best = cand
            return best

        ans = 0
        for r in range(m):
            for c in range(n):
                res = dfs(r, c)
                if res > ans:
                    ans = res
        return ans
