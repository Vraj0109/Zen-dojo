import java.util.*;

class Solution {
    public int longestFlightRoute(int n, int[][] flights) {
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[n + 1];
        for (int[] f : flights) {
            adj.get(f[0]).add(f[1]);
            indeg[f[1]]++;
        }
        Deque<Integer> q = new ArrayDeque<>();
        for (int i = 1; i <= n; i++) {
            if (indeg[i] == 0) q.add(i);
        }
        List<Integer> topo = new ArrayList<>(n);
        while (!q.isEmpty()) {
            int u = q.poll();
            topo.add(u);
            for (int v : adj.get(u)) {
                if (--indeg[v] == 0) q.add(v);
            }
        }
        int[] dp = new int[n + 1];
        Arrays.fill(dp, -1);
        dp[1] = 1;
        for (int u : topo) {
            if (dp[u] == -1) continue;
            for (int v : adj.get(u)) {
                if (dp[u] + 1 > dp[v]) {
                    dp[v] = dp[u] + 1;
                }
            }
        }
        return dp[n];
    }
}
