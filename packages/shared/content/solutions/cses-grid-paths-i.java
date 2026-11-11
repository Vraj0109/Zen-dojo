import java.util.*;

class Solution {
    public int gridPaths(String[] grid) {
        int n = grid.length;
        if (n == 0 || grid[0].charAt(0) == '*' || grid[n - 1].charAt(n - 1) == '*') return 0;
        final int MOD = 1000000007;
        int[] dp = new int[n];
        dp[0] = 1;
        for (int r = 0; r < n; r++) {
            for (int c = 0; c < n; c++) {
                if (grid[r].charAt(c) == '*') {
                    dp[c] = 0;
                } else if (c > 0) {
                    dp[c] = (dp[c] + dp[c - 1]) % MOD;
                }
            }
        }
        return dp[n - 1];
    }
}
