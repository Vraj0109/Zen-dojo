import java.util.*;

class Solution {
    public int minCostConnectPoints(int[][] p) {
        int n = p.length;
        long[] best = new long[n];
        Arrays.fill(best, Long.MAX_VALUE);
        boolean[] in = new boolean[n];
        best[0] = 0;
        long total = 0;
        for (int it = 0; it < n; it++) {
            int u = -1;
            for (int i = 0; i < n; i++) {
                if (!in[i] && (u == -1 || best[i] < best[u])) u = i;
            }
            in[u] = true;
            total += best[u];
            for (int v = 0; v < n; v++) {
                if (in[v]) continue;
                long d = Math.abs((long) p[u][0] - p[v][0]) + Math.abs((long) p[u][1] - p[v][1]);
                best[v] = Math.min(best[v], d);
            }
        }
        return (int) total;
    }
}