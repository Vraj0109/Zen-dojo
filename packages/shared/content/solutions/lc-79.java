class Solution {
    private boolean dfs(String[][] b, String w, int r, int c, int i) {
        if (i == w.length()) return true;
        if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || b[r][c].charAt(0) != w.charAt(i)) return false;
        String saved = b[r][c];
        b[r][c] = "#";
        boolean ok = dfs(b, w, r + 1, c, i + 1) || dfs(b, w, r - 1, c, i + 1) || dfs(b, w, r, c + 1, i + 1) || dfs(b, w, r, c - 1, i + 1);
        b[r][c] = saved;
        return ok;
    }
    public boolean exist(String[][] board, String word) {
        for (int r = 0; r < board.length; r++) {
            for (int c = 0; c < board[0].length; c++) {
                if (dfs(board, word, r, c, 0)) return true;
            }
        }
        return false;
    }
}