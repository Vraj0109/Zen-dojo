class Solution:
    def solveSudoku(self, board: List[List[str]]) -> List[List[str]]:
        row_mask = [0] * 9
        col_mask = [0] * 9
        box_mask = [0] * 9

        for r in range(9):
            for c in range(9):
                if board[r][c] != ".":
                    d = int(board[r][c])
                    bit = 1 << d
                    row_mask[r] |= bit
                    col_mask[c] |= bit
                    box_mask[(r // 3) * 3 + (c // 3)] |= bit

        def solve():
            for r in range(9):
                for c in range(9):
                    if board[r][c] != ".":
                        continue
                    b_idx = (r // 3) * 3 + (c // 3)
                    for d in range(1, 10):
                        bit = 1 << d
                        if (row_mask[r] & bit) or (col_mask[c] & bit) or (box_mask[b_idx] & bit):
                            continue
                        row_mask[r] |= bit
                        col_mask[c] |= bit
                        box_mask[b_idx] |= bit
                        board[r][c] = str(d)
                        if solve():
                            return True
                        board[r][c] = "."
                        row_mask[r] &= ~bit
                        col_mask[c] &= ~bit
                        box_mask[b_idx] &= ~bit
                    return False
            return True

        solve()
        return board
