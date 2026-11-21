from typing import List

class Solution:
    def chessboardAndQueens(self, board: List[str]) -> int:
        count = 0
        col = [False] * 8
        diag1 = [False] * 16
        diag2 = [False] * 16

        def solve(row: int):
            nonlocal count
            if row == 8:
                count += 1
                return
            for c in range(8):
                if board[row][c] == '*':
                    continue
                if col[c] or diag1[row + c] or diag2[row - c + 7]:
                    continue
                col[c] = diag1[row + c] = diag2[row - c + 7] = True
                solve(row + 1)
                col[c] = diag1[row + c] = diag2[row - c + 7] = False

        solve(0)
        return count
