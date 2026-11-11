class Solution {
    private int m, n;
    private int[][] memo;
    private int[] dr = {1, -1, 0, 0};
    private int[] dc = {0, 0, 1, -1};

    private int dfs(int[][] mat, int r, int c) {
        if (memo[r][c] != 0) return memo[r][c];
        int best = 1;
        for (int i = 0; i < 4; i++) {
            int nr = r + dr[i], nc = c + dc[i];
            if (nr >= 0 && nr < m && nc >= 0 && nc < n && mat[nr][nc] > mat[r][c]) {
                best = Math.max(best, 1 + dfs(mat, nr, nc));
            }
        }
        return memo[r][c] = best;
    }

    public int longestIncreasingPath(int[][] matrix) {
        if (matrix.length == 0 || matrix[0].length == 0) return 0;
        m = matrix.length;
        n = matrix[0].length;
        memo = new int[m][n];
        int ans = 0;
        for (int r = 0; r < m; r++) {
            for (int c = 0; c < n; c++) {
                ans = Math.max(ans, dfs(matrix, r, c));
            }
        }
        return ans;
    }
}
