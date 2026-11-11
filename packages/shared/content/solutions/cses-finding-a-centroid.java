import java.util.*;

class Solution {
    public int findingACentroid(int n, int[][] edges) {
        List<Integer>[] adj = new ArrayList[n + 1];
        for (int i = 1; i <= n; i++) adj[i] = new ArrayList<>();
        for (int[] e : edges) {
            adj[e[0]].add(e[1]);
            adj[e[1]].add(e[0]);
        }
        int[] par = new int[n + 1];
        int[] order = new int[n];
        int[] sz = new int[n + 1];
        int[] big = new int[n + 1];
        Arrays.fill(sz, 1);
        int head = 0, tail = 0;
        order[tail++] = 1;
        while (head < tail) {
            int u = order[head++];
            for (int v : adj[u]) {
                if (v == par[u]) continue;
                par[v] = u;
                order[tail++] = v;
            }
        }
        for (int i = n - 1; i >= 1; i--) {
            int v = order[i], p = par[v];
            sz[p] += sz[v];
            big[p] = Math.max(big[p], sz[v]);
        }
        for (int v = 1; v <= n; v++) {
            if (Math.max(big[v], n - sz[v]) <= n / 2) return v;
        }
        return -1;
    }
}
