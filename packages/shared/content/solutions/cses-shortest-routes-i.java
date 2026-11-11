import java.util.*;

class Solution {
    public long[] shortestRoutesI(int n, int[][] flights) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] f : flights) {
            adj.get(f[0]).add(new int[] {f[1], f[2]});
        }
        long INF = 4000000000000000000L;
        long[] dist = new long[n + 1];
        Arrays.fill(dist, INF);
        dist[1] = 0;
        PriorityQueue<long[]> pq = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
        pq.add(new long[] {0, 1});
        while (!pq.isEmpty()) {
            long[] cur = pq.poll();
            long d = cur[0];
            int u = (int) cur[1];
            if (d > dist[u]) continue;
            for (int[] edge : adj.get(u)) {
                int v = edge[0], w = edge[1];
                if (dist[u] + w < dist[v]) {
                    dist[v] = dist[u] + w;
                    pq.add(new long[] {dist[v], v});
                }
            }
        }
        long[] out = new long[n];
        for (int i = 1; i <= n; i++) {
            out[i - 1] = (dist[i] == INF ? -1L : dist[i]);
        }
        return out;
    }
}
