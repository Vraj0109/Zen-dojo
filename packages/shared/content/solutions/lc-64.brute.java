class Solution {
    private int dfs(int[][] grid, int r, int c, int m, int n) {
        if (r == m - 1 && c == n - 1) return grid[r][c];
        if (r >= m || c >= n) return 1000000000;
        return grid[r][c] + Math.min(dfs(grid, r + 1, c, m, n), dfs(grid, r, c + 1, m, n));
    }

    public int minPathSum(int[][] grid) {
        return dfs(grid, 0, 0, grid.length, grid[0].length);
    }
}
