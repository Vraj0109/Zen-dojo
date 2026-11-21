class Solution {
    public int[] forestQueries(String[] forest, int[][] queries) {
        int[] ans = new int[queries.length];
        for (int q = 0; q < queries.length; q++) {
            int y1 = queries[q][0] - 1, x1 = queries[q][1] - 1;
            int y2 = queries[q][2] - 1, x2 = queries[q][3] - 1;
            int count = 0;
            for (int r = y1; r <= y2; r++) {
                for (int c = x1; c <= x2; c++) {
                    if (forest[r].charAt(c) == '*') count++;
                }
            }
            ans[q] = count;
        }
        return ans;
    }
}
