from typing import List

class Solution:
    def gridColoring(self, grid: List[str]) -> List[str]:
        r, c = len(grid), len(grid[0])
        out = [['A'] * c for _ in range(r)]
        for i in range(r):
            for j in range(c):
                for ch in ('A', 'B', 'C', 'D'):
                    if ch == grid[i][j]:
                        continue
                    if j > 0 and out[i][j - 1] == ch:
                        continue
                    if i > 0 and out[i - 1][j] == ch:
                        continue
                    out[i][j] = ch
                    break
        return [''.join(row) for row in out]
