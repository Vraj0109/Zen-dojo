import java.util.*;

class Solution {
    public int minimumObstacles(int[][] grid) {
        int r = grid.length, c = grid[0].length;
        int[][] dist = new int[r][c];
        for (int i = 0; i < r; i++) Arrays.fill(dist[i], Integer.MAX_VALUE);
        Deque<int[]> dq = new ArrayDeque<>();
        dist[0][0] = 0;
        dq.offerLast(new int[]{0, 0});
        int[] dx = {1, -1, 0, 0};
        int[] dy = {0, 0, 1, -1};
        while (!dq.isEmpty()) {
            int[] top = dq.pollFirst();
            int x = top[0], y = top[1];
            for (int k = 0; k < 4; k++) {
                int nx = x + dx[k], ny = y + dy[k];
                if (nx < 0 || ny < 0 || nx >= r || ny >= c) continue;
                int w = grid[nx][ny];
                if (dist[x][y] + w < dist[nx][ny]) {
                    dist[nx][ny] = dist[x][y] + w;
                    if (w == 0) dq.offerFirst(new int[]{nx, ny});
                    else dq.offerLast(new int[]{nx, ny});
                }
            }
        }
        return dist[r - 1][c - 1];
    }
}