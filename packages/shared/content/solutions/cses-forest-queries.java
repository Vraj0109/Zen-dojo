class Solution {
    public int[] forestQueries(String[] forest, int[][] queries) {
        int n = forest.length;
        int[][] p = new int[n + 1][n + 1];
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j <= n; j++) {
                int tree = (forest[i - 1].charAt(j - 1) == '*') ? 1 : 0;
                p[i][j] = tree + p[i - 1][j] + p[i][j - 1] - p[i - 1][j - 1];
            }
        }
        int[] ans = new int[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int y1 = queries[i][0], x1 = queries[i][1], y2 = queries[i][2], x2 = queries[i][3];
            ans[i] = p[y2][x2] - p[y1 - 1][x2] - p[y2][x1 - 1] + p[y1 - 1][x1 - 1];
        }
        return ans;
    }
}
