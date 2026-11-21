class Solution {
    public int rectangleCutting(int a, int b) {
        int[][] dp = new int[a + 1][b + 1];
        for (int w = 1; w <= a; w++) {
            for (int h = 1; h <= b; h++) {
                if (w == h) {
                    dp[w][h] = 0;
                    continue;
                }
                int best = 1000000000;
                for (int k = 1; k < w; k++) {
                    best = Math.min(best, dp[k][h] + dp[w - k][h] + 1);
                }
                for (int k = 1; k < h; k++) {
                    best = Math.min(best, dp[w][k] + dp[w][h - k] + 1);
                }
                dp[w][h] = best;
            }
        }
        return dp[a][b];
    }
}
