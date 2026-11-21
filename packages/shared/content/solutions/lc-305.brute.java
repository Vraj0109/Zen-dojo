import java.util.*;

public class Solution {
    private final int[] dr = {1, -1, 0, 0};
    private final int[] dc = {0, 0, 1, -1};

    private void bfs(int r, int c, int m, int n, int[][] grid, boolean[][] visited) {
        visited[r][c] = true;
        Queue<int[]> q = new LinkedList<>();
        q.offer(new int[]{r, c});
        while (!q.isEmpty()) {
            int[] cur = q.poll();
            for (int i = 0; i < 4; i++) {
                int nr = cur[0] + dr[i];
                int nc = cur[1] + dc[i];
                if (nr >= 0 && nr < m && nc >= 0 && nc < n && grid[nr][nc] == 1 && !visited[nr][nc]) {
                    visited[nr][nc] = true;
                    q.offer(new int[]{nr, nc});
                }
            }
        }
    }

    public int[] numIslands2(int m, int n, int[][] positions) {
        int[][] grid = new int[m][n];
        int[] res = new int[positions.length];

        for (int p = 0; p < positions.length; p++) {
            int r = positions[p][0], c = positions[p][1];
            grid[r][c] = 1;

            boolean[][] visited = new boolean[m][n];
            int islands = 0;
            for (int i = 0; i < m; i++) {
                for (int j = 0; j < n; j++) {
                    if (grid[i][j] == 1 && !visited[i][j]) {
                        islands++;
                        bfs(i, j, m, n, grid, visited);
                    }
                }
            }
            res[p] = islands;
        }
        return res;
    }
}
