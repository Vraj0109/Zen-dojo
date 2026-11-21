class Solution {
    public int arrayDescription(int[] arr, int m) {
        final int MOD = 1000000007;
        int n = arr.length;
        int[] dp = new int[m + 2];
        if (arr[0] == 0) {
            for (int v = 1; v <= m; v++) dp[v] = 1;
        } else {
            dp[arr[0]] = 1;
        }
        for (int i = 1; i < n; i++) {
            int[] nextDp = new int[m + 2];
            int lo = (arr[i] == 0) ? 1 : arr[i];
            int hi = (arr[i] == 0) ? m : arr[i];
            for (int v = lo; v <= hi; v++) {
                long ways = (long) dp[v - 1] + dp[v] + dp[v + 1];
                nextDp[v] = (int) (ways % MOD);
            }
            dp = nextDp;
        }
        int ans = 0;
        for (int v = 1; v <= m; v++) {
            ans = (ans + dp[v]) % MOD;
        }
        return ans;
    }
}
