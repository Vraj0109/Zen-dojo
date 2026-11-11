import java.util.*;

class Solution {
    private int r, c;
    private void fill(int[][] h, boolean[][] seen, int sx, int sy) {
        if (seen[sx][sy]) return;
        seen[sx][sy] = true;
        Queue<int[]> q = new ArrayDeque<>();
        q.offer(new int[]{sx, sy});
        int[] dx = {1, -1, 0, 0};
        int[] dy = {0, 0, 1, -1};
        while (!q.isEmpty()) {
            int[] curr = q.poll();
            int x = curr[0], y = curr[1];
            for (int d = 0; d < 4; d++) {
                int nx = x + dx[d], ny = y + dy[d];
                if (nx < 0 || ny < 0 || nx >= r || ny >= c || seen[nx][ny] || h[nx][ny] < h[x][y]) continue;
                seen[nx][ny] = true;
                q.offer(new int[]{nx, ny});
            }
        }
    }
    public int[][] pacificAtlantic(int[][] heights) {
        r = heights.length;
        c = heights[0].length;
        boolean[][] pac = new boolean[r][c];
        boolean[][] atl = new boolean[r][c];
        for (int i = 0; i < r; i++) {
            fill(heights, pac, i, 0);
            fill(heights, atl, i, c - 1);
        }
        for (int j = 0; j < c; j++) {
            fill(heights, pac, 0, j);
            fill(heights, atl, r - 1, j);
        }
        List<int[]> out = new ArrayList<>();
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                if (pac[i][j] && atl[i][j]) out.add(new int[]{i, j});
            }
        }
        return out.toArray(new int[out.size()][]);
    }
}