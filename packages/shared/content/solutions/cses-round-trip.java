class Solution {
    static class DSU {
        int[] parent;
        DSU(int n) {
            parent = new int[n + 1];
            for (int i = 0; i <= n; i++) parent[i] = i;
        }
        int find(int i) {
            if (parent[i] == i) return i;
            return parent[i] = find(parent[i]);
        }
        boolean unite(int i, int j) {
            int rootI = find(i);
            int rootJ = find(j);
            if (rootI == rootJ) return false;
            parent[rootI] = rootJ;
            return true;
        }
    }

    public boolean roundTrip(int n, int[][] roads) {
        DSU dsu = new DSU(n);
        for (int[] r : roads) {
            if (!dsu.unite(r[0], r[1])) return true;
        }
        return false;
    }
}
