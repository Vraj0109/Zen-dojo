import java.util.*;

class Solution {
    public int gameRoutes(int n, int[][] teleporters) {
        final int MOD = 1000000007;
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        int[] indeg = new int[n + 1];
        for (int[] t : teleporters) {
            adj.get(t[0]).add(t[1]);
            indeg[t[1]]++;
        }
        Deque<Integer> q = new ArrayDeque<>();
        for (int i = 1; i <= n; i++) {
            if (indeg[i] == 0) q.add(i);
        }
        int[] ways = new int[n + 1];
        ways[1] = 1;
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : adj.get(u)) {
                ways[v] = (ways[v] + ways[u]) % MOD;
                if (--indeg[v] == 0) q.add(v);
            }
        }
        return ways[n];
    }
}
