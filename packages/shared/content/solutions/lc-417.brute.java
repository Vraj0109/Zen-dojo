import java.util.*;

class Solution {
    private boolean canReachPacific(int[][] h, int sr, int sc, int r, int c) {
        boolean[][] vis = new boolean[r][c];
        Queue<int[]> q = new LinkedList<>();
        q.add(new int[]{sr, sc});
        vis[sr][sc] = true;
        int[] dx = {1, -1, 0, 0}, dy = {0, 0, 1, -1};
        while (!q.isEmpty()) {
            int[] cell = q.poll();
            int x = cell[0], y = cell[1];
            if (x == 0 || y == 0) return true;
            for (int d = 0; d < 4; d++) {
                int nx = x + dx[d], ny = y + dy[d];
                if (nx >= 0 && nx < r && ny >= 0 && ny < c && !vis[nx][ny] && h[nx][ny] <= h[x][y]) {
                    vis[nx][ny] = true;
                    q.add(new int[]{nx, ny});
                }
            }
        }
        return false;
    }

    private boolean canReachAtlantic(int[][] h, int sr, int sc, int r, int c) {
        boolean[][] vis = new boolean[r][c];
        Queue<int[]> q = new LinkedList<>();
        q.add(new int[]{sr, sc});
        vis[sr][sc] = true;
        int[] dx = {1, -1, 0, 0}, dy = {0, 0, 1, -1};
        while (!q.isEmpty()) {
            int[] cell = q.poll();
            int x = cell[0], y = cell[1];
            if (x == r - 1 || y == c - 1) return true;
            for (int d = 0; d < 4; d++) {
                int nx = x + dx[d], ny = y + dy[d];
                if (nx >= 0 && nx < r && ny >= 0 && ny < c && !vis[nx][ny] && h[nx][ny] <= h[x][y]) {
                    vis[nx][ny] = true;
                    q.add(new int[]{nx, ny});
                }
            }
        }
        return false;
    }

    public int[][] pacificAtlantic(int[][] heights) {
        int r = heights.length, c = heights[0].length;
        List<int[]> out = new ArrayList<>();
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                if (canReachPacific(heights, i, j, r, c) && canReachAtlantic(heights, i, j, r, c)) {
                    out.add(new int[]{i, j});
                }
            }
        }
        int[][] res = new int[out.size()][2];
        for (int i = 0; i < out.size(); i++) res[i] = out.get(i);
        return res;
    }
}
