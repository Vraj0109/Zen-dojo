class Solution {
    public int maximalSquare(int[][] matrix) {
        int R = matrix.length, C = matrix[0].length, best = 0;
        int[][] dp = new int[R + 1][C + 1];
        for (int i = 1; i <= R; i++) {
            for (int j = 1; j <= C; j++) {
                if (matrix[i - 1][j - 1] == 1) {
                    dp[i][j] = 1 + Math.min(dp[i - 1][j], Math.min(dp[i][j - 1], dp[i - 1][j - 1]));
                    best = Math.max(best, dp[i][j]);
                }
            }
        }
        return best * best;
    }
}