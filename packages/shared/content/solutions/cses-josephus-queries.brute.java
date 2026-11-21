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
        for (int q = 0; q < queries.length; q++) {
            ans[q] = solve(queries[q][0], queries[q][1]);
        }
        return ans;
    }
}
