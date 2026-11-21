import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Queue;

class Solution {
    public long[] treeDistancesII(int n, int[][] edges) {
        if (n == 1) return new long[]{0};
        List<List<Integer>> adj = new ArrayList<>(n + 1);
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        long[] ans = new long[n];
        int[] dist = new int[n + 1];
        for (int i = 1; i <= n; i++) {
            Arrays.fill(dist, -1);
            Queue<Integer> q = new ArrayDeque<>();
            dist[i] = 0;
            q.add(i);
            long sumD = 0;
            while (!q.isEmpty()) {
                int u = q.poll();
                sumD += dist[u];
                for (int v : adj.get(u)) {
                    if (dist[v] == -1) {
                        dist[v] = dist[u] + 1;
                        q.add(v);
                    }
                }
            }
            ans[i - 1] = sumD;
        }
        return ans;
    }
}
