from typing import List

class Solution:
    def chessboardAndQueens(self, board: List[str]) -> int:
        col = [False] * 8
        d1 = [False] * 16
        d2 = [False] * 16

        def go(row: int) -> int:
            if row == 8:
                return 1
            total = 0
            for c in range(8):
                if board[row][c] == '*' or col[c] or d1[row + c] or d2[row - c + 7]:
                    continue
                col[c] = d1[row + c] = d2[row - c + 7] = True
                total += go(row + 1)
                col[c] = d1[row + c] = d2[row - c + 7] = False
            return total

        return go(0)
