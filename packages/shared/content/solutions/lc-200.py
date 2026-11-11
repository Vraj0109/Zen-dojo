# verify: skip-stress
from typing import List

class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        rows, cols = len(grid), len(grid[0])
        count = 0
        dr = [1, -1, 0, 0]
        dc = [0, 0, 1, -1]
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != "1":
                    continue
                count += 1
                st = [(r, c)]
                grid[r][c] = "0"
                while st:
                    x, y = st.pop()
                    for d in range(4):
                        nr, nc = x + dr[d], y + dc[d]
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1":
                            grid[nr][nc] = "0"
                            st.append((nr, nc))
        return count