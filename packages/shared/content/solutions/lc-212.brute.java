import java.util.*;

class Solution {
    private boolean dfs(String[][] board, String word, int r, int c, int idx, boolean[][] visited) {
        if (idx == word.length()) return true;
        int m = board.length;
        int n = board[0].length;
        if (r < 0 || r >= m || c < 0 || c >= n || visited[r][c] || board[r][c].charAt(0) != word.charAt(idx)) {
            return false;
        }

        visited[r][c] = true;
        int[] dr = {0, 0, 1, -1};
        int[] dc = {1, -1, 0, 0};
        for (int i = 0; i < 4; i++) {
            if (dfs(board, word, r + dr[i], c + dc[i], idx + 1, visited)) {
                visited[r][c] = false;
                return true;
            }
        }
        visited[r][c] = false;
        return false;
    }

    private boolean exists(String[][] board, String word) {
        int m = board.length;
        int n = board[0].length;
        boolean[][] visited = new boolean[m][n];
        for (int r = 0; r < m; r++) {
            for (int c = 0; c < n; c++) {
                if (dfs(board, word, r, c, 0, visited)) {
                    return true;
                }
            }
        }
        return false;
    }

    public String[] findWords(String[][] board, String[] words) {
        List<String> result = new ArrayList<>();
        for (String w : words) {
            if (exists(board, w)) {
                result.add(w);
            }
        }
        return result.toArray(new String[0]);
    }
}
