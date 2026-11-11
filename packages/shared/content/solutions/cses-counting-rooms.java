import java.util.*;

class Solution {
    public int countingRooms(String[] grid) {
        if (grid.length == 0 || grid[0].length() == 0) return 0;
        int n = grid.length, m = grid[0].length();
        char[][] g = new char[n][m];
        for (int i = 0; i < n; i++) g[i] = grid[i].toCharArray();
        int rooms = 0;
        int[] dr = {-1, 1, 0, 0};
        int[] dc = {0, 0, -1, 1};
        Deque<int[]> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (g[i][j] == '.') {
                    rooms++;
                    g[i][j] = '#';
                    q.add(new int[] {i, j});
                    while (!q.isEmpty()) {
                        int[] cur = q.poll();
                        int r = cur[0], c = cur[1];
                        for (int k = 0; k < 4; k++) {
                            int nr = r + dr[k], nc = c + dc[k];
                            if (nr >= 0 && nr < n && nc >= 0 && nc < m && g[nr][nc] == '.') {
                                g[nr][nc] = '#';
                                q.add(new int[] {nr, nc});
                            }
                        }
                    }
                }
            }
        }
        return rooms;
    }
}
