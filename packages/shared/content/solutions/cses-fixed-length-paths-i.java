import java.util.*;

class Solution {
    public long fixedLengthPathsI(int n, int k, int[][] edges) {
        List<Integer>[] adj = new ArrayList[n + 1];
        for (int i = 1; i <= n; i++) adj[i] = new ArrayList<>();
        for (int[] e : edges) {
            adj[e[0]].add(e[1]);
            adj[e[1]].add(e[0]);
        }
        boolean[] removed = new boolean[n + 1];
        int[] par = new int[n + 1];
        int[] sz = new int[n + 1];
        int[] cnt = new int[n + 2];
        long ans = 0;
        int[] stk = new int[n + 1];
        int stkTop = 0;
        stk[stkTop++] = 1;
        int[] comp = new int[n + 1];
        int[] nodes = new int[n + 1];
        int[] depth = new int[n + 1];

        while (stkTop > 0) {
            int start = stk[--stkTop];
            int compSize = 0;
            comp[compSize++] = start;
            par[start] = 0;
            for (int h = 0; h < compSize; h++) {
                int u = comp[h];
                for (int v : adj[u]) {
                    if (!removed[v] && v != par[u]) {
                        par[v] = u;
                        comp[compSize++] = v;
                    }
                }
            }
            int total = compSize;
            for (int h = 0; h < total; h++) sz[comp[h]] = 1;
            for (int i = total - 1; i >= 1; i--) sz[par[comp[i]]] += sz[comp[i]];
            int c = start;
            while (true) {
                int nxt = 0;
                for (int v : adj[c]) {
                    if (!removed[v] && v != par[c] && sz[v] * 2 > total) {
                        nxt = v;
                        break;
                    }
                }
                if (nxt == 0) break;
                c = nxt;
            }
            cnt[0] = 1;
            int maxSeen = 0;
            for (int child : adj[c]) {
                if (removed[child]) continue;
                int nodeCount = 0;
                nodes[nodeCount] = child;
                depth[nodeCount] = 1;
                par[child] = c;
                nodeCount++;
                for (int h = 0; h < nodeCount; h++) {
                    int u = nodes[h];
                    int d = depth[h];
                    for (int v : adj[u]) {
                        if (!removed[v] && v != par[u]) {
                            par[v] = u;
                            nodes[nodeCount] = v;
                            depth[nodeCount] = d + 1;
                            nodeCount++;
                        }
                    }
                }
                for (int h = 0; h < nodeCount; h++) {
                    int d = depth[h];
                    if (k - d >= 0 && k - d <= maxSeen) ans += cnt[k - d];
                }
                for (int h = 0; h < nodeCount; h++) {
                    int d = depth[h];
                    cnt[d]++;
                    if (d > maxSeen) maxSeen = d;
                }
            }
            for (int d = 0; d <= maxSeen; d++) cnt[d] = 0;
            removed[c] = true;
            for (int v : adj[c]) {
                if (!removed[v]) stk[stkTop++] = v;
            }
        }
        return ans;
    }
}
