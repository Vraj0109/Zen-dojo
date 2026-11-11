import java.util.*;

class Solution {
    public int cherryPickup(int[][] grid) {
        int n = grid.length;
        int NEG = Integer.MIN_VALUE / 2;
        int[][] dp = new int[n][n];
        for (int i = 0; i < n; i++) Arrays.fill(dp[i], NEG);
        dp[0][0] = grid[0][0];
        for (int t = 1; t <= 2 * n - 2; t++) {
            int[][] nd = new int[n][n];
            for (int i = 0; i < n; i++) Arrays.fill(nd[i], NEG);
            for (int r1 = Math.max(0, t - (n - 1)); r1 <= Math.min(n - 1, t); r1++) {
                int c1 = t - r1;
                if (grid[r1][c1] == -1) continue;
                for (int r2 = Math.max(0, t - (n - 1)); r2 <= Math.min(n - 1, t); r2++) {
                    int c2 = t - r2;
                    if (grid[r2][c2] == -1) continue;
                    int best = NEG;
                    for (int d1 = 0; d1 < 2; d1++) {
                        for (int d2 = 0; d2 < 2; d2++) {
                            int p1 = r1 - d1, p2 = r2 - d2;
                            if (p1 < 0 || p2 < 0) continue;
                            best = Math.max(best, dp[p1][p2]);
                        }
                    }
                    if (best == NEG) continue;
                    int gain = grid[r1][c1] + (r1 != r2 ? grid[r2][c2] : 0);
                    nd[r1][r2] = best + gain;
                }
            }
            dp = nd;
        }
        return Math.max(0, dp[n - 1][n - 1]);
    }
}