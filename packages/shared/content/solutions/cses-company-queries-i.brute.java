class Solution {
    public int[] companyQueriesI(int n, int[] bosses, int[][] queries) {
        int[] par = new int[n + 1];
        for (int i = 0; i < n - 1; i++) {
            par[i + 2] = bosses[i];
        }
        int[] ans = new int[queries.length];
        for (int q = 0; q < queries.length; q++) {
            int x = queries[q][0];
            int k = queries[q][1];
            int cur = x;
            while (k > 0 && cur != 0) {
                cur = par[cur];
                k--;
            }
            ans[q] = cur == 0 ? -1 : cur;
        }
        return ans;
    }
}
