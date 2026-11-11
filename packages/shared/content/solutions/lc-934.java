import java.util.*;

class Solution {
    private int n;
    private int[] dr = {1, -1, 0, 0};
    private int[] dc = {0, 0, 1, -1};

    private void dfs(int[][] g, int r, int c, Queue<int[]> q) {
        if (r < 0 || r >= n || c < 0 || c >= n || g[r][c] != 1) return;
        g[r][c] = 2;
        q.add(new int[]{r, c});
        for (int i = 0; i < 4; i++) {
            dfs(g, r + dr[i], c + dc[i], q);
        }
    }

    public int shortestBridge(int[][] grid) {
        n = grid.length;
        Queue<int[]> q = new LinkedList<>();
        boolean found = false;
        for (int r = 0; r < n && !found; r++) {
            for (int c = 0; c < n && !found; c++) {
                if (grid[r][c] == 1) {
                    dfs(grid, r, c, q);
                    found = true;
                }
            }
        }

        int steps = 0;
        while (!q.isEmpty()) {
            int sz = q.size();
            while (sz-- > 0) {
                int[] cell = q.poll();
                int r = cell[0], c = cell[1];
                for (int i = 0; i < 4; i++) {
                    int nr = r + dr[i], nc = c + dc[i];
                    if (nr < 0 || nr >= n || nc < 0 || nc >= n) continue;
                    if (grid[nr][nc] == 1) return steps;
                    if (grid[nr][nc] == 0) {
                        grid[nr][nc] = 2;
                        q.add(new int[]{nr, nc});
                    }
                }
            }
            steps++;
        }
        return -1;
    }
}
