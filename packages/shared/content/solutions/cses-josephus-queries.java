class Solution {
    private int solve(int n, int k) {
        if (n == 1) return 1;
        if (k <= (n + 1) / 2) {
            if (2 * k > n) return 1;
            return 2 * k;
        }
        int temp = solve(n / 2, k - (n + 1) / 2);
        if (n % 2 == 1) {
            return 2 * temp + 1;
        } else {
            return 2 * temp - 1;
        }
    }
    public int[] josephusQueries(int[][] queries) {
        int[] ans = new int[queries.length];
        for (int i = 0; i < queries.length; i++) {
            ans[i] = solve(queries[i][0], queries[i][1]);
        }
        return ans;
    }
}