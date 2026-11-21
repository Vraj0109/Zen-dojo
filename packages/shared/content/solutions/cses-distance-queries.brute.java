import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Queue;

class Solution {
    public int[] distanceQueries(int n, int[][] edges, int[][] queries) {
        List<List<Integer>> adj = new ArrayList<>(n + 1);
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        int[] ans = new int[queries.length];
        int[] dist = new int[n + 1];
        for (int q = 0; q < queries.length; q++) {
            int a = queries[q][0];
            int b = queries[q][1];
            if (a == b) {
                ans[q] = 0;
                continue;
            }
            Arrays.fill(dist, -1);
            Queue<Integer> qu = new ArrayDeque<>();
            dist[a] = 0;
            qu.add(a);
            while (!qu.isEmpty()) {
                int u = qu.poll();
                if (u == b) break;
                for (int v : adj.get(u)) {
                    if (dist[v] == -1) {
                        dist[v] = dist[u] + 1;
                        qu.add(v);
                    }
                }
            }
            ans[q] = dist[b];
        }
        return ans;
    }
}
