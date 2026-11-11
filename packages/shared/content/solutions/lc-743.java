import java.util.*;

class Solution {
    public int networkDelayTime(int[][] times, int n, int k) {
        List<int[]>[] g = new List[n + 1];
        for (int i = 0; i <= n; i++) g[i] = new ArrayList<>();
        for (int[] t : times) g[t[0]].add(new int[]{t[1], t[2]});
        int[] dist = new int[n + 1];
        Arrays.fill(dist, Integer.MAX_VALUE);
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
        dist[k] = 0;
        pq.offer(new int[]{0, k});
        while (!pq.isEmpty()) {
            int[] top = pq.poll();
            int d = top[0], u = top[1];
            if (d > dist[u]) continue;
            for (int[] edge : g[u]) {
                int v = edge[0], w = edge[1];
                if (d + w < dist[v]) {
                    dist[v] = d + w;
                    pq.offer(new int[]{dist[v], v});
                }
            }
        }
        int best = 0;
        for (int i = 1; i <= n; i++) {
            if (dist[i] == Integer.MAX_VALUE) return -1;
            best = Math.max(best, dist[i]);
        }
        return best;
    }
}