import java.util.*;

class Solution {
    public int[] distanceQueries(int n, int[][] edges, int[][] queries) {
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
        int LOG = 1;
        while ((1 << LOG) <= n) LOG++;
        int[][] up = new int[LOG][n + 1];
        for (int v = 1; v <= n; v++) up[0][v] = par[v];
        for (int j = 1; j < LOG; j++) {
            for (int v = 1; v <= n; v++) {
                up[j][v] = up[j - 1][up[j - 1][v]];
            }
        }
        int[] ans = new int[queries.length];
        for (int qi = 0; qi < queries.length; qi++) {
            int u = queries[qi][0], v = queries[qi][1];
            int a = u, b = v;
            if (dep[a] < dep[b]) { int tmp = a; a = b; b = tmp; }
            int diff = dep[a] - dep[b];
            for (int j = 0; j < LOG; j++) {
                if (((diff >> j) & 1) != 0) a = up[j][a];
            }
            int lca;
            if (a == b) {
                lca = a;
            } else {
                for (int j = LOG - 1; j >= 0; j--) {
                    if (up[j][a] != up[j][b]) {
                        a = up[j][a];
                        b = up[j][b];
                    }
                }
                lca = up[0][a];
            }
            ans[qi] = dep[u] + dep[v] - 2 * dep[lca];
        }
        return ans;
    }
}
