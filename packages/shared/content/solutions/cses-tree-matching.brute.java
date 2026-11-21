import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.Queue;

class Solution {
    public int treeMatching(int n, int[][] edges) {
        List<List<Integer>> adj = new ArrayList<>(n + 1);
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            adj.get(e[0]).add(e[1]);
            adj.get(e[1]).add(e[0]);
        }
        int[] par = new int[n + 1];
        List<Integer> order = new ArrayList<>();
        order.add(1);
        for (int h = 0; h < order.size(); h++) {
            int u = order.get(h);
            for (int v : adj.get(u)) {
                if (v == par[u]) continue;
                par[v] = u;
                order.add(v);
            }
        }
        boolean[] used = new boolean[n + 1];
        int ans = 0;
        for (int i = order.size() - 1; i >= 1; i--) {
            int v = order.get(i);
            int p = par[v];
            if (!used[v] && p != 0 && !used[p]) {
                used[v] = true;
                used[p] = true;
                ans++;
            }
        }
        return ans;
    }
}
