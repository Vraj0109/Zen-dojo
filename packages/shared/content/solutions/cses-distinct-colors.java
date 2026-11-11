import java.util.*;

class Solution {
    private int n;
    private int[] bit;
    private void add(int i, int x) {
        for (; i <= n; i += i & -i) bit[i] += x;
    }
    private int sum(int i) {
        int s = 0;
        for (; i > 0; i -= i & -i) s += bit[i];
        return s;
    }
    public int[] distinctColors(int[] colors, int[][] edges) {
        n = colors.length;
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
        int[] arr = new int[n + 1];
        for (int v = 1; v <= n; v++) arr[tin[v]] = colors[v - 1];
        List<Integer>[] byEnd = new ArrayList[n + 1];
        for (int i = 1; i <= n; i++) byEnd[i] = new ArrayList<>();
        for (int v = 1; v <= n; v++) byEnd[tout[v]].add(v);

        bit = new int[n + 2];
        Map<Integer, Integer> last = new HashMap<>();
        int[] ans = new int[n];
        for (int r = 1; r <= n; r++) {
            Integer prev = last.get(arr[r]);
            if (prev != null) add(prev, -1);
            add(r, 1);
            last.put(arr[r], r);
            for (int v : byEnd[r]) {
                ans[v - 1] = sum(r) - sum(tin[v] - 1);
            }
        }
        return ans;
    }
}
