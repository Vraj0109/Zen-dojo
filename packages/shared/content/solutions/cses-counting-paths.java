import java.util.*;

class Solution {
    public int[] countingPaths(int n, int[][] edges, int[][] paths) {
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
        int[] mark = new int[n + 1];
        for (int[] p : paths) {
            int a = p[0], b = p[1];
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
            mark[p[0]]++;
            mark[p[1]]++;
            mark[lca]--;
            if (par[lca] != 0) mark[par[lca]]--;
        }
        for (int i = n - 1; i >= 1; i--) {
            mark[par[order[i]]] += mark[order[i]];
        }
        int[] ans = new int[n];
        System.arraycopy(mark, 1, ans, 0, n);
        return ans;
    }
}
