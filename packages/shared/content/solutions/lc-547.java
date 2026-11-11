class Solution {
    private void dfs(int[][] m, boolean[] seen, int u) {
        seen[u] = true;
        for (int v = 0; v < m.length; v++) {
            if (m[u][v] == 1 && !seen[v]) dfs(m, seen, v);
        }
    }
    public int findCircleNum(int[][] isConnected) {
        int n = isConnected.length, count = 0;
        boolean[] seen = new boolean[n];
        for (int i = 0; i < n; i++) {
            if (!seen[i]) {
                count++;
                dfs(isConnected, seen, i);
            }
        }
        return count;
    }
}