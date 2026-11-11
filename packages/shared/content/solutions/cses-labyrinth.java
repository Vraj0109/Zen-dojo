import java.util.*;

class Solution {
    public int labyrinth(String[] grid) {
        int n = grid.length, m = grid[0].length();
        int sr = -1, sc = -1, tr = -1, tc = -1;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                char ch = grid[i].charAt(j);
                if (ch == 'A') { sr = i; sc = j; }
                else if (ch == 'B') { tr = i; tc = j; }
            }
        }
        if (sr == -1 || tr == -1) return -1;
        int[] dist = new int[n * m];
        Arrays.fill(dist, -1);
        dist[sr * m + sc] = 0;
        Deque<Integer> q = new ArrayDeque<>();
        q.add(sr * m + sc);
        int[] dr = {-1, 1, 0, 0};
        int[] dc = {0, 0, -1, 1};
        while (!q.isEmpty()) {
            int u = q.poll();
            int r = u / m, c = u % m;
            if (r == tr && c == tc) return dist[u];
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nr < n && nc >= 0 && nc < m && grid[nr].charAt(nc) != '#') {
                    int v = nr * m + nc;
                    if (dist[v] == -1) {
                        dist[v] = dist[u] + 1;
                        q.add(v);
                    }
                }
            }
        }
        return -1;
    }
}
