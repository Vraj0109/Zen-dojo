import java.util.*;

class Solution {
    private int n;
    private boolean[] cols, d1, d2;
    private int[] pos;
    private List<String[]> out;
    private void go(int row) {
        if (row == n) {
            String[] board = new String[n];
            for (int r = 0; r < n; r++) {
                char[] line = new char[n];
                Arrays.fill(line, '.');
                line[pos[r]] = 'Q';
                board[r] = new String(line);
            }
            out.add(board);
            return;
        }
        for (int c = 0; c < n; c++) {
            if (cols[c] || d1[row + c] || d2[row - c + n - 1]) continue;
            cols[c] = d1[row + c] = d2[row - c + n - 1] = true;
            pos[row] = c;
            go(row + 1);
            cols[c] = d1[row + c] = d2[row - c + n - 1] = false;
        }
    }
    public String[][] solveNQueens(int nn) {
        n = nn;
        cols = new boolean[n];
        d1 = new boolean[2 * n];
        d2 = new boolean[2 * n];
        pos = new int[n];
        out = new ArrayList<>();
        go(0);
        return out.toArray(new String[out.size()][]);
    }
}