import java.util.*;

class Solution {
    public boolean cycleFinding(int n, int[][] edges) {
        long[] dist = new long[n + 1];
        boolean any = false;
        for (int iter = 1; iter <= n; iter++) {
            any = false;
            for (int[] e : edges) {
                int u = e[0], v = e[1];
                long w = e[2];
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    any = true;
                }
            }
            if (!any) break;
        }
        return any;
    }
}
