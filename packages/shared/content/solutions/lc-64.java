class Solution {
    public int minPathSum(int[][] grid) {
        int rows = grid.length, cols = grid[0].length;
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (r == 0 && c == 0) continue;
                int up = r > 0 ? grid[r - 1][c] : Integer.MAX_VALUE;
                int left = c > 0 ? grid[r][c - 1] : Integer.MAX_VALUE;
                grid[r][c] += Math.min(up, left);
            }
        }
        return grid[rows - 1][cols - 1];
    }
}