import java.util.*;

class Solution {
    public int orangesRotting(int[][] grid) {
        int r = grid.length, c = grid[0].length;
        Queue<int[]> q = new ArrayDeque<>();
        int fresh = 0;
        for (int i = 0; i < r; i++) {
            for (int j = 0; j < c; j++) {
                if (grid[i][j] == 2) q.offer(new int[]{i, j});
                else if (grid[i][j] == 1) fresh++;
            }
        }
        int minutes = 0;
        int[] dx = {1, -1, 0, 0};
        int[] dy = {0, 0, 1, -1};
        while (!q.isEmpty() && fresh > 0) {
            int sz = q.size();
            while (sz-- > 0) {
                int[] curr = q.poll();
                int x = curr[0], y = curr[1];
                for (int d = 0; d < 4; d++) {
                    int nx = x + dx[d], ny = y + dy[d];
                    if (nx < 0 || ny < 0 || nx >= r || ny >= c || grid[nx][ny] != 1) continue;
                    grid[nx][ny] = 2;
                    fresh--;
                    q.offer(new int[]{nx, ny});
                }
            }
            minutes++;
        }
        return fresh == 0 ? minutes : -1;
    }
}