import java.util.*;

class Solution {
    public int shortestPathLength(int[][] graph) {
        int n = graph.length;
        int full = (1 << n) - 1;
        int[][] dist = new int[n][1 << n];
        for (int i = 0; i < n; i++) Arrays.fill(dist[i], -1);
        Queue<int[]> q = new ArrayDeque<>();
        for (int i = 0; i < n; i++) {
            dist[i][1 << i] = 0;
            q.offer(new int[]{i, 1 << i});
        }
        while (!q.isEmpty()) {
            int[] top = q.poll();
            int u = top[0], mask = top[1];
            if (mask == full) return dist[u][mask];
            for (int v : graph[u]) {
                int nm = mask | (1 << v);
                if (dist[v][nm] == -1) {
                    dist[v][nm] = dist[u][mask] + 1;
                    q.offer(new int[]{v, nm});
                }
            }
        }
        return 0;
    }
}