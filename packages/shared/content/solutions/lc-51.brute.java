import java.util.*;

class Solution {
    private boolean isValid(List<Integer> p, int n) {
        for (int i = 0; i < n; i++) {
            for (int j = i + 1; j < n; j++) {
                if (Math.abs(p.get(i) - p.get(j)) == Math.abs(i - j)) {
                    return false;
                }
            }
        }
        return true;
    }

    private void permute(int n, boolean[] used, List<Integer> cur, List<String[]> res) {
        if (cur.size() == n) {
            if (isValid(cur, n)) {
                String[] board = new String[n];
                for (int r = 0; r < n; r++) {
                    char[] line = new char[n];
                    Arrays.fill(line, '.');
                    line[cur.get(r)] = 'Q';
                    board[r] = new String(line);
                }
                res.add(board);
            }
            return;
        }

        for (int c = 0; c < n; c++) {
            if (!used[c]) {
                used[c] = true;
                cur.add(c);
                permute(n, used, cur, res);
                cur.remove(cur.size() - 1);
                used[c] = false;
            }
        }
    }

    public String[][] solveNQueens(int n) {
        List<String[]> res = new ArrayList<>();
        boolean[] used = new boolean[n];
        permute(n, used, new ArrayList<>(), res);
        return res.toArray(new String[0][]);
    }
}
