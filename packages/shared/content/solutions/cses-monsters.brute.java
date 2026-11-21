import java.util.*;

class Solution {
    public int monsters(String[] grid) {
        int n = grid.length, m = grid[0].length();
        final int INF = 1000000000;
        int[] mDist = new int[n * m];
        int[] pDist = new int[n * m];
        Arrays.fill(mDist, INF);
        Arrays.fill(pDist, INF);
        Queue<Integer> q = new ArrayDeque<>();
        int pr = -1, pc = -1;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (grid[i].charAt(j) == 'M') {
                    mDist[i * m + j] = 0;
                    q.add(i * m + j);
                } else if (grid[i].charAt(j) == 'A') {
                    pr = i; pc = j;
                }
            }
        }
        int[] dr = {-1, 1, 0, 0};
        int[] dc = {0, 0, -1, 1};
        while (!q.isEmpty()) {
            int u = q.poll();
            int r = u / m, c = u % m;
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nr < n && nc >= 0 && nc < m && grid[nr].charAt(nc) != '#') {
                    int v = nr * m + nc;
                    if (mDist[v] == INF) {
                        mDist[v] = mDist[u] + 1;
                        q.add(v);
                    }
                }
            }
        }
        if (pr == -1) return -1;
        pDist[pr * m + pc] = 0;
        q.add(pr * m + pc);
        while (!q.isEmpty()) {
            int u = q.poll();
            int r = u / m, c = u % m;
            if (r == 0 || r == n - 1 || c == 0 || c == m - 1) {
                return pDist[u];
            }
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nr < n && nc >= 0 && nc < m && grid[nr].charAt(nc) != '#') {
                    int v = nr * m + nc;
                    if (pDist[v] == INF && pDist[u] + 1 < mDist[v]) {
                        pDist[v] = pDist[u] + 1;
                        q.add(v);
                    }
                }
            }
        }
        return -1;
    }
}
