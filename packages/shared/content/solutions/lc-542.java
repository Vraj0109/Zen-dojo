import java.util.*;

class Solution {
    public int[][] updateMatrix(int[][] mat) {
        int r = mat.length, c = mat[0].length;
        int[][] dist = new int[r][c];
        for (int i = 0; i < r; i++) Arrays.fill(dist[i], -1);
        Queue<int[]> q = new ArrayDeque<>();
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                if (mat[i][j] == 0) {
                    dist[i][j] = 0;
                    q.offer(new int[]{i, j});
                }
            }
        }
        int[] dx = {1, -1, 0, 0};
        int[] dy = {0, 0, 1, -1};
        while (!q.isEmpty()) {
            int[] curr = q.poll();
            int x = curr[0], y = curr[1];
            for (int d = 0; d < 4; d++) {
                int nx = x + dx[d], ny = y + dy[d];
                if (nx < 0 || ny < 0 || nx >= r || ny >= c || dist[nx][ny] != -1) continue;
                dist[nx][ny] = dist[x][y] + 1;
                q.offer(new int[]{nx, ny});
            }
        }
        return dist;
    }
}