import java.util.*;

class Solution {
    public int[] sumOfDistancesInTree(int n, int[][] edges) {
        List<Integer>[] g = new List[n];
        for (int i = 0; i < n; i++) g[i] = new ArrayList<>();
        for (int[] e : edges) {
            g[e[0]].add(e[1]);
            g[e[1]].add(e[0]);
        }
        List<Integer> order = new ArrayList<>(n);
        int[] parent = new int[n];
        Arrays.fill(parent, -1);
        Deque<Integer> st = new ArrayDeque<>();
        st.push(0);
        while (!st.isEmpty()) {
            int u = st.pop();
            order.add(u);
            for (int v : g[u]) {
                if (v != parent[u]) {
                    parent[v] = u;
                    st.push(v);
                }
            }
        }
        long[] cnt = new long[n];
        Arrays.fill(cnt, 1);
        long[] ans = new long[n];
        for (int i = n - 1; i > 0; i--) {
            int u = order.get(i);
            cnt[parent[u]] += cnt[u];
            ans[parent[u]] += ans[u] + cnt[u];
        }
        for (int i = 1; i < n; i++) {
            int u = order.get(i);
            ans[u] = ans[parent[u]] - cnt[u] + (n - cnt[u]);
        }
        int[] res = new int[n];
        for (int i = 0; i < n; i++) res[i] = (int) ans[i];
        return res;
    }
}