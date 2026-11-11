import java.util.*;

class Solution {
    public int swimInWater(int[][] grid) {
        int n = grid.length;
        boolean[][] seen = new boolean[n][n];
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        pq.offer(new int[]{grid[0][0], 0, 0});
        seen[0][0] = true;
        int[] dx = {1, -1, 0, 0};
        int[] dy = {0, 0, 1, -1};
        while (!pq.isEmpty()) {
            int[] top = pq.poll();
            int t = top[0], x = top[1], y = top[2];
            if (x == n - 1 && y == n - 1) return t;
            for (int k = 0; k < 4; k++) {
                int nx = x + dx[k], ny = y + dy[k];
                if (nx < 0 || ny < 0 || nx >= n || ny >= n || seen[nx][ny]) continue;
                seen[nx][ny] = true;
                pq.offer(new int[]{Math.max(t, grid[nx][ny]), nx, ny});
            }
        }
        return -1;
    }
}