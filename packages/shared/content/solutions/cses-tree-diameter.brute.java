import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Queue;

class Solution {
    public int treeDiameter(int n, int[][] edges) {
        if (n <= 1) return 0;
        List<List<Integer>> adj = new ArrayList<>(n + 1);
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        int maxDist = 0;
        int[] dist = new int[n + 1];
        for (int i = 1; i <= n; i++) {
            Arrays.fill(dist, -1);
            Queue<Integer> q = new ArrayDeque<>();
            dist[i] = 0;
            q.add(i);
            while (!q.isEmpty()) {
                int u = q.poll();
                if (dist[u] > maxDist) maxDist = dist[u];
                for (int v : adj.get(u)) {
                    if (dist[v] == -1) {
                        dist[v] = dist[u] + 1;
                        q.add(v);
                    }
                }
            }
        }
        return maxDist;
    }
}
