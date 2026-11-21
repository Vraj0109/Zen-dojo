import java.util.*;

class Solution {
    public int minCostToSupplyWater(int n, int[] wells, int[][] pipes) {
        List<List<int[]>> adj = new ArrayList<>();
        for (int i = 0; i <= n; i++) adj.add(new ArrayList<>());

        for (int i = 1; i <= n; i++) {
            adj.get(0).add(new int[]{i, wells[i - 1]});
            adj.get(i).add(new int[]{0, wells[i - 1]});
        }
        for (int[] p : pipes) {
            adj.get(p[0]).add(new int[]{p[1], p[2]});
            adj.get(p[1]).add(new int[]{p[0], p[2]});
        }

        boolean[] visited = new boolean[n + 1];
        int[] minEdge = new int[n + 1];
        Arrays.fill(minEdge, Integer.MAX_VALUE);
        minEdge[0] = 0;
        int totalCost = 0;

        for (int step = 0; step <= n; step++) {
            int u = -1;
            for (int i = 0; i <= n; i++) {
                if (!visited[i] && (u == -1 || minEdge[i] < minEdge[u])) {
                    u = i;
                }
            }
            visited[u] = true;
            totalCost += minEdge[u];

            for (int[] edge : adj.get(u)) {
                int v = edge[0], w = edge[1];
                if (!visited[v] && w < minEdge[v]) {
                    minEdge[v] = w;
                }
            }
        }
        return totalCost;
    }
}
