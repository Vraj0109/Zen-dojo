class Solution {
    public int[] rangeXorQueries(int[] arr, int[][] queries) {
        int[] ans = new int[queries.length];
        for (int q = 0; q < queries.length; q++) {
            int a = queries[q][0] - 1;
            int b = queries[q][1] - 1;
            int x = 0;
            for (int i = a; i <= b; i++) {
                x ^= arr[i];
            }
            ans[q] = x;
        }
        return ans;
    }
}
