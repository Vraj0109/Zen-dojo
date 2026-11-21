import java.util.*;

class Solution {
    private int minTime;

    private void dfs(int r, int c, int currentMax, int[][] grid, boolean[][] visited) {
        int n = grid.length;
        if (r == n - 1 && c == n - 1) {
            minTime = Math.min(minTime, currentMax);
            return;
        }
        if (currentMax >= minTime) return;

        visited[r][c] = true;
        int[] dr = {0, 0, 1, -1};
        int[] dc = {1, -1, 0, 0};
        for (int i = 0; i < 4; i++) {
            int nr = r + dr[i];
            int nc = c + dc[i];
            if (nr >= 0 && nr < n && nc >= 0 && nc < n && !visited[nr][nc]) {
                dfs(nr, nc, Math.max(currentMax, grid[nr][nc]), grid, visited);
            }
        }
        visited[r][c] = false;
    }

    public int swimInWater(int[][] grid) {
        minTime = Integer.MAX_VALUE;
        int n = grid.length;
        boolean[][] visited = new boolean[n][n];
        dfs(0, 0, grid[0][0], grid, visited);
        return minTime;
    }
}
