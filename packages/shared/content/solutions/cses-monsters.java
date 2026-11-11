import java.util.*;

class Solution {
    public int monsters(String[] grid) {
        int n = grid.length, m = grid[0].length();
        int ar = -1, ac = -1;
        Deque<Integer> mq = new ArrayDeque<>();
        int[] mdist = new int[n * m];
        Arrays.fill(mdist, 1000000000);
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                char ch = grid[i].charAt(j);
                if (ch == 'M') {
                    mdist[i * m + j] = 0;
                    mq.add(i * m + j);
                } else if (ch == 'A') {
                    ar = i; ac = j;
                }
            }
        }
        int[] dr = {-1, 1, 0, 0};
        int[] dc = {0, 0, -1, 1};
        while (!mq.isEmpty()) {
            int u = mq.poll();
            int r = u / m, c = u % m;
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nr < n && nc >= 0 && nc < m && grid[nr].charAt(nc) != '#') {
                    int v = nr * m + nc;
                    if (mdist[v] > mdist[u] + 1) {
                        mdist[v] = mdist[u] + 1;
                        mq.add(v);
                    }
                }
            }
        }

        if (ar == 0 || ar == n - 1 || ac == 0 || ac == m - 1) return 0;

        int[] pdist = new int[n * m];
        Arrays.fill(pdist, -1);
        Deque<Integer> pq = new ArrayDeque<>();
        pdist[ar * m + ac] = 0;
        pq.add(ar * m + ac);
        while (!pq.isEmpty()) {
            int u = pq.poll();
            int r = u / m, c = u % m;
            for (int k = 0; k < 4; k++) {
                int nr = r + dr[k], nc = c + dc[k];
                if (nr >= 0 && nr < n && nc >= 0 && nc < m && grid[nr].charAt(nc) != '#') {
                    int v = nr * m + nc;
                    if (pdist[v] == -1 && pdist[u] + 1 < mdist[v]) {
                        pdist[v] = pdist[u] + 1;
                        if (nr == 0 || nr == n - 1 || nc == 0 || nc == m - 1) {
                            return pdist[v];
                        }
                        pq.add(v);
                    }
                }
            }
        }
        return -1;
    }
}
