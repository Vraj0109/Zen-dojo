import java.util.*;

class Solution {
    private int dijkstraCount(int src, int n, int threshold, List<List<int[]>> g) {
        int[] dist = new int[n];
        Arrays.fill(dist, Integer.MAX_VALUE);
        PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));

        dist[src] = 0;
        pq.offer(new int[]{0, src});

        while (!pq.isEmpty()) {
            int[] curr = pq.poll();
            int d = curr[0];
            int u = curr[1];
            if (d > dist[u]) continue;

            for (int[] edge : g.get(u)) {
                int v = edge[0];
                int w = edge[1];
                if (d + w < dist[v]) {
                    dist[v] = d + w;
                    pq.offer(new int[]{dist[v], v});
                }
            }
        }

        int count = 0;
        for (int i = 0; i < n; i++) {
            if (i != src && dist[i] <= threshold) {
                count++;
            }
        }
        return count;
    }

    public int findTheCity(int n, int[][] edges, int distanceThreshold) {
        List<List<int[]>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            g.add(new ArrayList<>());
        }
        for (int[] e : edges) {
            g.get(e[0]).add(new int[]{e[1], e[2]});
            g.get(e[1]).add(new int[]{e[0], e[2]});
        }

        int bestCity = -1;
        int minReachable = Integer.MAX_VALUE;

        for (int i = 0; i < n; i++) {
            int reachable = dijkstraCount(i, n, distanceThreshold, g);
            if (reachable <= minReachable) {
                minReachable = reachable;
                bestCity = i;
            }
        }

        return bestCity;
    }
}
