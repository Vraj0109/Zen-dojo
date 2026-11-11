import java.util.*;

class Solution {
    public long flightDiscount(int n, int[][] flights) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] f : flights) {
            adj.get(f[0]).add(new int[] {f[1], f[2]});
        }
        long INF = 4000000000000000000L;
        long[][] dist = new long[n + 1][2];
        for (int i = 0; i <= n; i++) {
            dist[i][0] = INF;
            dist[i][1] = INF;
        }
        PriorityQueue<long[]> pq = new PriorityQueue<>((a, b) -> Long.compare(a[0], b[0]));
        dist[1][0] = 0;
        pq.add(new long[] {0, 1, 0});
        while (!pq.isEmpty()) {
            long[] cur = pq.poll();
            long d = cur[0];
            int u = (int) cur[1];
            int used = (int) cur[2];
            if (d > dist[u][used]) continue;
            for (int[] edge : adj.get(u)) {
                int v = edge[0], c = edge[1];
                if (used == 0) {
                    if (dist[u][0] + c < dist[v][0]) {
                        dist[v][0] = dist[u][0] + c;
                        pq.add(new long[] {dist[v][0], v, 0});
                    }
                    long discounted = c / 2;
                    if (dist[u][0] + discounted < dist[v][1]) {
                        dist[v][1] = dist[u][0] + discounted;
                        pq.add(new long[] {dist[v][1], v, 1});
                    }
                } else {
                    if (dist[u][1] + c < dist[v][1]) {
                        dist[v][1] = dist[u][1] + c;
                        pq.add(new long[] {dist[v][1], v, 1});
                    }
                }
            }
        }
        return dist[n][1];
    }
}
