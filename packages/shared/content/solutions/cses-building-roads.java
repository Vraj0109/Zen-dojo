class Solution {
    static class DSU {
        int[] parent;
        int comps;
        DSU(int n) {
            parent = new int[n + 1];
            for (int i = 0; i <= n; i++) parent[i] = i;
            comps = n;
        }
        int find(int i) {
            if (parent[i] == i) return i;
            return parent[i] = find(parent[i]);
        }
        void unite(int i, int j) {
            int rootI = find(i);
            int rootJ = find(j);
            if (rootI != rootJ) {
                parent[rootI] = rootJ;
                comps--;
            }
        }
    }

    public int buildingRoads(int n, int[][] roads) {
        DSU dsu = new DSU(n);
        for (int[] r : roads) {
            dsu.unite(r[0], r[1]);
        }
        return dsu.comps - 1;
    }
}
