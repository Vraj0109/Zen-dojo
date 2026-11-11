# verify: skip-stress
from typing import List

class Solution:
    def solveNQueens(self, n: int) -> List[List[str]]:
        cols = [False] * n
        d1 = [False] * (2 * n)
        d2 = [False] * (2 * n)
        pos = [0] * n
        out = []
        def go(row):
            if row == n:
                board = []
                for r in range(n):
                    line = ['.'] * n
                    line[pos[r]] = 'Q'
                    board.append("".join(line))
                out.append(board)
                return
            for c in range(n):
                if cols[c] or d1[row + c] or d2[row - c + n - 1]:
                    continue
                cols[c] = d1[row + c] = d2[row - c + n - 1] = True
                pos[row] = c
                go(row + 1)
                cols[c] = d1[row + c] = d2[row - c + n - 1] = False
        go(0)
        return out