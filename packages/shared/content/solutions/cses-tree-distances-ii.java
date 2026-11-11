import java.util.*;

class Solution {
    public long[] treeDistancesII(int n, int[][] edges) {
        List<Integer>[] adj = new ArrayList[n + 1];
        for (int i = 1; i <= n; i++) adj[i] = new ArrayList<>();
        for (int[] e : edges) {
            adj[e[0]].add(e[1]);
            adj[e[1]].add(e[0]);
        }
        int[] par = new int[n + 1];
        int[] dep = new int[n + 1];
        int[] order = new int[n];
        int head = 0, tail = 0;
        order[tail++] = 1;
        while (head < tail) {
            int u = order[head++];
            for (int v : adj[u]) {
                if (v == par[u]) continue;
                par[v] = u;
                dep[v] = dep[u] + 1;
                order[tail++] = v;
            }
        }
        long[] sz = new long[n + 1];
        Arrays.fill(sz, 1);
        for (int i = n - 1; i >= 1; i--) {
            sz[par[order[i]]] += sz[order[i]];
        }
        long[] ans = new long[n + 1];
        for (int v = 1; v <= n; v++) ans[1] += dep[v];
        for (int i = 1; i < n; i++) {
            int c = order[i];
            ans[c] = ans[par[c]] + n - 2 * sz[c];
        }
        long[] res = new long[n];
        System.arraycopy(ans, 1, res, 0, n);
        return res;
    }
}
