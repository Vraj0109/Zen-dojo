class Solution {
    public int[] companyQueriesII(int n, int[] bosses, int[][] queries) {
        int[] par = new int[n + 1];
        for (int i = 0; i < n - 1; i++) {
            par[i + 2] = bosses[i];
        }
        int[] ans = new int[queries.length];
        boolean[] vis = new boolean[n + 1];
        for (int q = 0; q < queries.length; q++) {
            int a = queries[q][0], b = queries[q][1];
            int cur = a;
            while (cur != 0) {
                vis[cur] = true;
                cur = par[cur];
            }
            cur = b;
            while (cur != 0 && !vis[cur]) {
                cur = par[cur];
            }
            ans[q] = cur;
            // clean up vis
            cur = a;
            while (cur != 0) {
                vis[cur] = false;
                cur = par[cur];
            }
        }
        return ans;
    }
}
