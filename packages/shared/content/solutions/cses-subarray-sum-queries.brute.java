class Solution {
    public long[] subarraySumQueries(int[] arr, int[][] queries) {
        int[] a = arr.clone();
        int n = a.length;
        long[] ans = new long[queries.length];
        for (int q = 0; q < queries.length; q++) {
            int k = queries[q][0] - 1;
            int x = queries[q][1];
            a[k] = x;
            long maxSoFar = 0, cur = 0;
            for (int i = 0; i < n; i++) {
                cur += a[i];
                if (cur < 0) cur = 0;
                if (cur > maxSoFar) maxSoFar = cur;
            }
            ans[q] = maxSoFar;
        }
        return ans;
    }
}
