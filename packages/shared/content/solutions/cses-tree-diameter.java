import java.util.*;

class Solution {
    public int treeDiameter(int n, int[][] edges) {
        if (n <= 1) return 0;
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        int[] p1 = bfs(1, n, adj);
        int[] p2 = bfs(p1[0], n, adj);
        return p2[1];
    }

    private int[] bfs(int start, int n, List<List<Integer>> adj) {
        int[] dist = new int[n + 1];
        Arrays.fill(dist, -1);
        Deque<Integer> q = new ArrayDeque<>();
        dist[start] = 0;
        q.add(start);
        int farthest = start;
        while (!q.isEmpty()) {
            int u = q.poll();
            if (dist[u] > dist[farthest]) {
                farthest = u;
            }
            for (int v : adj.get(u)) {
                if (dist[v] == -1) {
                    dist[v] = dist[u] + 1;
                    q.add(v);
                }
            }
        }
        return new int[] {farthest, dist[farthest]};
    }
}
