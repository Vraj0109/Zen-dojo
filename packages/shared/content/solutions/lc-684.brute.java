import java.util.*;

class Solution {
    private boolean dfs(int src, int target, List<List<Integer>> adj, boolean[] visited) {
        if (src == target) return true;
        visited[src] = true;
        for (int next : adj.get(src)) {
            if (!visited[next]) {
                if (dfs(next, target, adj, visited)) return true;
            }
        }
        return false;
    }

    public int[] findRedundantConnection(int[][] edges) {
        int n = edges.length;
        List<List<Integer>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());
        for (int[] e : edges) {
            int u = e[0], v = e[1];
            boolean[] visited = new boolean[n + 1];
            if (dfs(u, v, adj, visited)) {
                return e;
            }
            adj.get(u).add(v);
            adj.get(v).add(u);
        }
        return new int[]{};
    }
}
