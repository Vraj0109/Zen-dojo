import java.util.*;

class Solution {
    private int[][][] memo;

    private int dp(int r1, int c1, int r2, int n, int[][] grid) {
        int c2 = r1 + c1 - r2;
        if (r1 >= n || c1 >= n || r2 >= n || c2 >= n || grid[r1][c1] == -1 || grid[r2][c2] == -1) {
            return (int) -1e9;
        }
        if (r1 == n - 1 && c1 == n - 1) {
            return grid[r1][c1];
        }
        if (memo[r1][c1][r2] != -1) {
            return memo[r1][c1][r2];
        }

        int cherries = grid[r1][c1];
        if (r1 != r2) {
            cherries += grid[r2][c2];
        }

        int nextMax = Math.max(
            Math.max(dp(r1 + 1, c1, r2 + 1, n, grid), dp(r1 + 1, c1, r2, n, grid)),
            Math.max(dp(r1, c1 + 1, r2 + 1, n, grid), dp(r1, c1 + 1, r2, n, grid))
        );

        cherries += nextMax;
        return memo[r1][c1][r2] = cherries;
    }

    public int cherryPickup(int[][] grid) {
        int n = grid.length;
        memo = new int[n][n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                Arrays.fill(memo[i][j], -1);
            }
        }
        int res = dp(0, 0, 0, n, grid);
        return Math.max(0, res);
    }
}
