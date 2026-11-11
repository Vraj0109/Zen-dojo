class Solution {
    public long[] staticRangeSumQueries(int[] arr, int[][] queries) {
        int n = arr.length;
        long[] pref = new long[n + 1];
        for (int i = 0; i < n; i++) {
            pref[i + 1] = pref[i] + arr[i];
        }
        long[] ans = new long[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int a = queries[i][0], b = queries[i][1];
            ans[i] = pref[b] - pref[a - 1];
        }
        return ans;
    }
}
