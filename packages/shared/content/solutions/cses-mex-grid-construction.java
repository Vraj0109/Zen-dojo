class Solution {
    public int[][] mexGrid(int n) {
        int[][] g = new int[n][n];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n; j++) {
                boolean[] used = new boolean[2 * n + 2];
                for (int k = 0; k < j; k++) used[g[i][k]] = true;
                for (int k = 0; k < i; k++) used[g[k][j]] = true;
                int m = 0;
                while (used[m]) m++;
                g[i][j] = m;
            }
        }
        return g;
    }
}
