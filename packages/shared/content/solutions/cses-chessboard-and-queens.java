class Solution {
    private String[] b;
    private boolean[] col = new boolean[8];
    private boolean[] d1 = new boolean[16];
    private boolean[] d2 = new boolean[16];

    private int go(int row) {
        if (row == 8) return 1;
        int total = 0;
        for (int c = 0; c < 8; c++) {
            if (b[row].charAt(c) == '*' || col[c] || d1[row + c] || d2[row - c + 7]) continue;
            col[c] = d1[row + c] = d2[row - c + 7] = true;
            total += go(row + 1);
            col[c] = d1[row + c] = d2[row - c + 7] = false;
        }
        return total;
    }

    public int chessboardAndQueens(String[] board) {
        b = board;
        col = new boolean[8];
        d1 = new boolean[16];
        d2 = new boolean[16];
        return go(0);
    }
}
