import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Queue;

class Solution {
    public int[] treeDistancesI(int n, int[][] edges) {
        if (n == 1) return new int[]{0};
        List<List<Integer>> adj = new ArrayList<>(n + 1);
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        int[] ans = new int[n];
        int[] dist = new int[n + 1];
        for (int i = 1; i <= n; i++) {
            Arrays.fill(dist, -1);
            Queue<Integer> q = new ArrayDeque<>();
            dist[i] = 0;
            q.add(i);
            int maxD = 0;
            while (!q.isEmpty()) {
                int u = q.poll();
                if (dist[u] > maxD) maxD = dist[u];
                for (int v : adj.get(u)) {
                    if (dist[v] == -1) {
                        dist[v] = dist[u] + 1;
                        q.add(v);
                    }
                }
            }
            ans[i - 1] = maxD;
        }
        return ans;
    }
}
