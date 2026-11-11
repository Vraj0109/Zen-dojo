class Solution {
    public int beautifulMatrix(int[][] grid) {
        for (int r = 0; r < 5; r++) {
            for (int c = 0; c < 5; c++) {
                if (grid[r][c] == 1) return Math.abs(r - 2) + Math.abs(c - 2);
            }
        }
        return -1;
    }
}
