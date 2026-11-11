import java.util.*;

class Solution {
    private int n;
    private int[] seg;
    private int query(int l, int r) {
        int res = 0;
        for (l += n, r += n + 1; l < r; l >>= 1, r >>= 1) {
            if ((l & 1) == 1) res = Math.max(res, seg[l++]);
            if ((r & 1) == 1) res = Math.max(res, seg[--r]);
        }
        return res;
    }
    public int[] pathQueriesII(int[] values, int[][] edges, int[][] queries) {
        n = values.length;
        List<Integer>[] adj = new ArrayList[n + 1];
        for (int i = 1; i <= n; i++) adj[i] = new ArrayList<>();
        for (int[] e : edges) {
            adj[e[0]].add(e[1]);
            adj[e[1]].add(e[0]);
        }
        int[] par = new int[n + 1];
        int[] dep = new int[n + 1];
        int[] order = new int[n];
        int[] sz = new int[n + 1];
        int[] heavy = new int[n + 1];
        Arrays.fill(sz, 1);
        int headIdx = 0, tailIdx = 0;
        order[tailIdx++] = 1;
        while (headIdx < tailIdx) {
            int u = order[headIdx++];
            for (int v : adj[u]) {
                if (v == par[u]) continue;
                par[v] = u;
                dep[v] = dep[u] + 1;
                order[tailIdx++] = v;
            }
        }
        for (int i = n - 1; i >= 1; i--) sz[par[order[i]]] += sz[order[i]];
        for (int i = n - 1; i >= 1; i--) {
            int v = order[i], p = par[v];
            if (heavy[p] == 0 || sz[v] > sz[heavy[p]]) heavy[p] = v;
        }
        int[] head = new int[n + 1];
        int[] pos = new int[n + 1];
        int cnt = 0;
        for (int i = 0; i < n; i++) {
            int u = order[i];
            if (u == 1 || heavy[par[u]] != u) {
                for (int v = u; v != 0; v = heavy[v]) {
                    head[v] = u;
                    pos[v] = cnt++;
                }
            }
        }
        seg = new int[2 * n];
        for (int v = 1; v <= n; v++) seg[n + pos[v]] = values[v - 1];
        for (int i = n - 1; i >= 1; i--) seg[i] = Math.max(seg[2 * i], seg[2 * i + 1]);

        List<Integer> ans = new ArrayList<>();
        for (int[] q : queries) {
            if (q[0] == 1) {
                int i = pos[q[1]] + n;
                seg[i] = q[2];
                for (i >>= 1; i >= 1; i >>= 1) seg[i] = Math.max(seg[2 * i], seg[2 * i + 1]);
            } else {
                int a = q[1], b = q[2], res = 0;
                while (head[a] != head[b]) {
                    if (dep[head[a]] < dep[head[b]]) { int tmp = a; a = b; b = tmp; }
                    res = Math.max(res, query(pos[head[a]], pos[a]));
                    a = par[head[a]];
                }
                if (pos[a] > pos[b]) { int tmp = a; a = b; b = tmp; }
                res = Math.max(res, query(pos[a], pos[b]));
                ans.add(res);
            }
        }
        int[] out = new int[ans.size()];
        for (int i = 0; i < ans.size(); i++) out[i] = ans.get(i);
        return out;
    }
}
