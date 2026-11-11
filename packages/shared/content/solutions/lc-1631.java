import java.util.*;

class Solution {
    public int minimumEffortPath(int[][] heights) {
        int r = heights.length, c = heights[0].length;
        int[][] dist = new int[r][c];
        for (int i = 0; i < r; i++) Arrays.fill(dist[i], Integer.MAX_VALUE);
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        dist[0][0] = 0;
        pq.offer(new int[]{0, 0, 0});
        int[] dx = {1, -1, 0, 0};
        int[] dy = {0, 0, 1, -1};
        while (!pq.isEmpty()) {
            int[] top = pq.poll();
            int d = top[0], x = top[1], y = top[2];
            if (d > dist[x][y]) continue;
            if (x == r - 1 && y == c - 1) return d;
            for (int k = 0; k < 4; k++) {
                int nx = x + dx[k], ny = y + dy[k];
                if (nx < 0 || ny < 0 || nx >= r || ny >= c) continue;
                int nd = Math.max(d, Math.abs(heights[nx][ny] - heights[x][y]));
                if (nd < dist[nx][ny]) {
                    dist[nx][ny] = nd;
                    pq.offer(new int[]{nd, nx, ny});
                }
            }
        }
        return 0;
    }
}