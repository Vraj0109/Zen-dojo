class Solution {
    public int[][] mexGrid(int n) {
        int[][] grid = new int[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                boolean[] used = new boolean[2 * n + 5];
                for (int c = 0; c < j; c++) {
                    used[grid[i][c]] = true;
                }
                for (int r = 0; r < i; r++) {
                    used[grid[r][j]] = true;
                }
                int mex = 0;
                while (used[mex]) mex++;
                grid[i][j] = mex;
            }
        }
        return grid;
    }
}
