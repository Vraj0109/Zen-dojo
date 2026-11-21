class Solution {
    private int count = 0;
    private boolean[] col = new boolean[8];
    private boolean[] diag1 = new boolean[16];
    private boolean[] diag2 = new boolean[16];

    public int chessboardAndQueens(String[] board) {
        count = 0;
        solve(0, board);
        return count;
    }

    private void solve(int row, String[] board) {
        if (row == 8) {
            count++;
            return;
        }
        for (int c = 0; c < 8; c++) {
            if (board[row].charAt(c) == '*') continue;
            if (col[c] || diag1[row + c] || diag2[row - c + 7]) continue;
            col[c] = diag1[row + c] = diag2[row - c + 7] = true;
            solve(row + 1, board);
            col[c] = diag1[row + c] = diag2[row - c + 7] = false;
        }
    }
}
