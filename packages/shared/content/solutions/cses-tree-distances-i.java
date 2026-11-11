import java.util.*;

class Solution {
    private int[] dist(int n, List<Integer>[] adj, int s) {
        int[] d = new int[n + 1];
        Arrays.fill(d, -1);
        int[] q = new int[n];
        int head = 0, tail = 0;
        d[s] = 0;
        q[tail++] = s;
        while (head < tail) {
            int u = q[head++];
            for (int v : adj[u]) {
                if (d[v] < 0) {
                    d[v] = d[u] + 1;
                    q[tail++] = v;
                }
            }
        }
        return d;
    }
    public int[] treeDistancesI(int n, int[][] edges) {
        List<Integer>[] adj = new ArrayList[n + 1];
        for (int i = 1; i <= n; i++) adj[i] = new ArrayList<>();
        for (int[] e : edges) {
            adj[e[0]].add(e[1]);
            adj[e[1]].add(e[0]);
        }
        int[] d1 = dist(n, adj, 1);
        int a = 1;
        for (int v = 1; v <= n; v++) if (d1[v] > d1[a]) a = v;
        int[] da = dist(n, adj, a);
        int b = a;
        for (int v = 1; v <= n; v++) if (da[v] > da[b]) b = v;
        int[] db = dist(n, adj, b);
        int[] ans = new int[n];
        for (int v = 1; v <= n; v++) {
            ans[v - 1] = Math.max(da[v], db[v]);
        }
        return ans;
    }
}
