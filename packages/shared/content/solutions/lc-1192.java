import java.util.*;

class Solution {
    public int[][] criticalConnections(int n, int[][] connections) {
        List<int[]>[] g = new List[n];
        for (int i = 0; i < n; i++) g[i] = new ArrayList<>();
        for (int i = 0; i < connections.length; i++) {
            g[connections[i][0]].add(new int[]{connections[i][1], i});
            g[connections[i][1]].add(new int[]{connections[i][0], i});
        }
        int[] disc = new int[n];
        Arrays.fill(disc, -1);
        int[] low = new int[n];
        int[] it = new int[n];
        int[] parentEdge = new int[n];
        Arrays.fill(parentEdge, -1);
        int[] parent = new int[n];
        Arrays.fill(parent, -1);
        List<int[]> out = new ArrayList<>();
        int timer = 0;
        Deque<Integer> st = new ArrayDeque<>();
        st.push(0);
        disc[0] = low[0] = timer++;
        while (!st.isEmpty()) {
            int u = st.peek();
            if (it[u] < g[u].size()) {
                int[] edge = g[u].get(it[u]++);
                int v = edge[0], id = edge[1];
                if (id == parentEdge[u]) continue;
                if (disc[v] == -1) {
                    disc[v] = low[v] = timer++;
                    parent[v] = u;
                    parentEdge[v] = id;
                    st.push(v);
                } else {
                    low[u] = Math.min(low[u], disc[v]);
                }
            } else {
                st.pop();
                int p = parent[u];
                if (p != -1) {
                    low[p] = Math.min(low[p], low[u]);
                    if (low[u] > disc[p]) out.add(new int[]{p, u});
                }
            }
        }
        return out.toArray(new int[out.size()][]);
    }
}