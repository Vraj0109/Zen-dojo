import java.util.*;

class Solution {
    private int n;
    private long[] bit;
    private void add(int i, long x) {
        for (; i <= n; i += i & -i) bit[i] += x;
    }
    private long sum(int i) {
        long s = 0;
        for (; i > 0; i -= i & -i) s += bit[i];
        return s;
    }
    public long[] subtreeQueries(int[] values, int[][] edges, int[][] queries) {
        n = values.length;
        List<Integer>[] adj = new ArrayList[n + 1];
        for (int i = 1; i <= n; i++) adj[i] = new ArrayList<>();
        for (int[] e : edges) {
            adj[e[0]].add(e[1]);
            adj[e[1]].add(e[0]);
        }
        int[] par = new int[n + 1];
        int[] tin = new int[n + 1];
        int[] tout = new int[n + 1];
        int[] it = new int[n + 1];
        int[] st = new int[n + 1];
        int stTop = 0;
        int timer = 0;
        st[stTop++] = 1;
        tin[1] = ++timer;
        while (stTop > 0) {
            int u = st[stTop - 1];
            if (it[u] < adj[u].size()) {
                int v = adj[u].get(it[u]++);
                if (v == par[u]) continue;
                par[v] = u;
                tin[v] = ++timer;
                st[stTop++] = v;
            } else {
                tout[u] = timer;
                stTop--;
            }
        }
        bit = new long[n + 2];
        long[] cur = new long[n + 1];
        for (int v = 1; v <= n; v++) {
            cur[v] = values[v - 1];
            add(tin[v], cur[v]);
        }
        List<Long> ans = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                add(tin[q[1]], (long) q[2] - cur[q[1]]);
                cur[q[1]] = q[2];
            } else {
                ans.add(sum(tout[q[1]]) - sum(tin[q[1]] - 1));
            }
        }
        long[] res = new long[ans.size()];
        for (int i = 0; i < ans.size(); i++) res[i] = ans.get(i);
        return res;
    }
}
