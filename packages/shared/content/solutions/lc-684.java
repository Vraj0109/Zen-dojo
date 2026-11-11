class Solution {
    private int[] par;
    private int find(int x) {
        return par[x] == x ? x : (par[x] = find(par[x]));
    }
    public int[] findRedundantConnection(int[][] edges) {
        int n = edges.length;
        par = new int[n + 1];
        for (int i = 0; i <= n; i++) par[i] = i;
        for (int[] e : edges) {
            int a = find(e[0]), b = find(e[1]);
            if (a == b) return e;
            par[a] = b;
        }
        return new int[0];
    }
}