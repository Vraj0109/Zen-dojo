class Solution {
    public long[] staticRangeSumQueries(int[] arr, int[][] queries) {
        long[] ans = new long[queries.length];
        for (int q = 0; q < queries.length; q++) {
            int a = queries[q][0] - 1;
            int b = queries[q][1] - 1;
            long sum = 0;
            for (int i = a; i <= b; i++) {
                sum += arr[i];
            }
            ans[q] = sum;
        }
        return ans;
    }
}
