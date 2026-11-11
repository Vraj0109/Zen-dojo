import java.util.*;

class Solution {
    public int[][] knightMovesGrid(int n) {
        int[][] d = new int[n][n];
        for (int i = 0; i < n; i++) Arrays.fill(d[i], -1);
        Deque<int[]> q = new ArrayDeque<>();
        d[0][0] = 0;
        q.push(new int[] {0, 0});
        int[] dx = {1, 2, 2, 1, -1, -2, -2, -1};
        int[] dy = {2, 1, -1, -2, -2, -1, 1, 2};
        while (!q.isEmpty()) {
            int[] cur = q.pollLast();
            int x = cur[0], y = cur[1];
            for (int k = 0; k < 8; k++) {
                int nx = x + dx[k], ny = y + dy[k];
                if (nx < 0 || ny < 0 || nx >= n || ny >= n || d[nx][ny] != -1) continue;
                d[nx][ny] = d[x][y] + 1;
                q.push(new int[] {nx, ny});
            }
        }
        return d;
    }
}
