import java.util.*;

class Solution {
    public int treeMatching(int n, int[][] edges) {
        List<Integer>[] adj = new ArrayList[n + 1];
        for (int i = 1; i <= n; i++) adj[i] = new ArrayList<>();
        for (int[] e : edges) {
            adj[e[0]].add(e[1]);
            adj[e[1]].add(e[0]);
        }
        int[] par = new int[n + 1];
        int[] order = new int[n];
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
        boolean[] used = new boolean[n + 1];
        int ans = 0;
        for (int i = n - 1; i >= 1; i--) {
            int v = order[i];
            if (!used[v] && !used[par[v]]) {
                used[v] = true;
                used[par[v]] = true;
                ans++;
            }
        }
        return ans;
    }
}
