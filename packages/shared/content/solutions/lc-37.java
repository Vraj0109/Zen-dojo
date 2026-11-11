class Solution {
    private int[] rowMask = new int[9], colMask = new int[9], boxMask = new int[9];

    private boolean solve(String[][] b) {
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                if (!b[r][c].equals(".")) continue;
                int bIdx = (r / 3) * 3 + (c / 3);
                for (int d = 1; d <= 9; d++) {
                    int bit = 1 << d;
                    if ((rowMask[r] & bit) != 0 || (colMask[c] & bit) != 0 || (boxMask[bIdx] & bit) != 0) continue;
                    rowMask[r] |= bit;
                    colMask[c] |= bit;
                    boxMask[bIdx] |= bit;
                    b[r][c] = String.valueOf(d);
                    if (solve(b)) return true;
                    b[r][c] = ".";
                    rowMask[r] &= ~bit;
                    colMask[c] &= ~bit;
                    boxMask[bIdx] &= ~bit;
                }
                return false;
            }
        }
        return true;
    }

    public String[][] solveSudoku(String[][] board) {
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                if (board[r][c] != null && !board[r][c].isEmpty() && board[r][c].charAt(0) != '.') {
                    int d = board[r][c].charAt(0) - '0';
                    int bit = 1 << d;
                    rowMask[r] |= bit;
                    colMask[c] |= bit;
                    boxMask[(r / 3) * 3 + (c / 3)] |= bit;
                }
            }
        }
        solve(board);
        return board;
    }
}
