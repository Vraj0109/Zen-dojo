import java.util.*;

class Solution {
    private int minEffort;

    private void dfs(int r, int c, int currentMax, int[][] h, boolean[][] visited) {
        int rows = h.length;
        int cols = h[0].length;
        if (r == rows - 1 && c == cols - 1) {
            minEffort = Math.min(minEffort, currentMax);
            return;
        }
        if (currentMax >= minEffort) return;

        visited[r][c] = true;
        int[] dr = {0, 0, 1, -1};
        int[] dc = {1, -1, 0, 0};
        for (int i = 0; i < 4; i++) {
            int nr = r + dr[i];
            int nc = c + dc[i];
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
                int diff = Math.abs(h[nr][nc] - h[r][c]);
                dfs(nr, nc, Math.max(currentMax, diff), h, visited);
            }
        }
        visited[r][c] = false;
    }

    public int minimumEffortPath(int[][] heights) {
        minEffort = Integer.MAX_VALUE;
        int rows = heights.length;
        int cols = heights[0].length;
        boolean[][] visited = new boolean[rows][cols];
        dfs(0, 0, 0, heights, visited);
        return minEffort;
    }
}
