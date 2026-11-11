import java.util.*;

class Solution {
    private int[] parent;

    private int findRoot(int x) {
        if (parent[x] == x) return x;
        return parent[x] = findRoot(parent[x]);
    }

    private boolean unite(int x, int y) {
        int rx = findRoot(x), ry = findRoot(y);
        if (rx == ry) return false;
        parent[rx] = ry;
        return true;
    }

    public int minCostToSupplyWater(int n, int[] wells, int[][] pipes) {
        List<int[]> edges = new ArrayList<>();
        for (int i = 1; i <= n; i++) {
            edges.add(new int[] {wells[i - 1], 0, i});
        }
        for (int[] p : pipes) {
            edges.add(new int[] {p[2], p[0], p[1]});
        }
        edges.sort((a, b) -> Integer.compare(a[0], b[0]));

        parent = new int[n + 1];
        for (int i = 0; i <= n; i++) parent[i] = i;

        int totalCost = 0, edgesCount = 0;
        for (int[] e : edges) {
            int cost = e[0], u = e[1], v = e[2];
            if (unite(u, v)) {
                totalCost += cost;
                edgesCount++;
                if (edgesCount == n) break;
            }
        }
        return totalCost;
    }
}
