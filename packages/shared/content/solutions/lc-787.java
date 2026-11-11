import java.util.*;

class Solution {
    public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        int INF = 1000000000;
        int[] dist = new int[n];
        Arrays.fill(dist, INF);
        dist[src] = 0;
        for (int round = 0; round <= k; round++) {
            int[] next = Arrays.copyOf(dist, n);
            for (int[] f : flights) {
                if (dist[f[0]] < INF) {
                    next[f[1]] = Math.min(next[f[1]], dist[f[0]] + f[2]);
                }
            }
            dist = next;
        }
        return dist[dst] >= INF ? -1 : dist[dst];
    }
}