import java.util.*;

class Solution {
    private int minCost;

    private void dfs(int u, int dst, int k, int cost, List<List<int[]>> g, boolean[] visited) {
        if (u == dst) {
            minCost = Math.min(minCost, cost);
            return;
        }
        if (k < 0 || cost >= minCost) return;

        visited[u] = true;
        for (int[] edge : g.get(u)) {
            int v = edge[0];
            int price = edge[1];
            if (!visited[v]) {
                dfs(v, dst, k - 1, cost + price, g, visited);
            }
        }
        visited[u] = false;
    }

    public int findCheapestPrice(int n, int[][] flights, int src, int dst, int k) {
        List<List<int[]>> g = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            g.add(new ArrayList<>());
        }
        for (int[] f : flights) {
            g.get(f[0]).add(new int[]{f[1], f[2]});
        }
        minCost = Integer.MAX_VALUE;
        boolean[] visited = new boolean[n];
        dfs(src, dst, k, 0, g, visited);
        return minCost == Integer.MAX_VALUE ? -1 : minCost;
    }
}
