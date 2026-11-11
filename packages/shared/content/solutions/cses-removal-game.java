class Solution {
    public long removalGame(int[] arr) {
        int n = arr.length;
        long total = 0;
        for (int x : arr) total += x;
        long[] dp = new long[n];
        for (int i = 0; i < n; i++) dp[i] = arr[i];
        for (int len = 2; len <= n; len++) {
            for (int i = 0; i <= n - len; i++) {
                int j = i + len - 1;
                dp[i] = Math.max((long) arr[i] - dp[i + 1], (long) arr[j] - dp[i]);
            }
        }
        return (total + dp[0]) / 2;
    }
}
