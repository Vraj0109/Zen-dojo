class Solution {
    public int[] staticRangeMinimumQueries(int[] arr, int[][] queries) {
        int[] ans = new int[queries.length];
        for (int q = 0; q < queries.length; q++) {
            int a = queries[q][0] - 1;
            int b = queries[q][1] - 1;
            int minVal = arr[a];
            for (int i = a + 1; i <= b; i++) {
                if (arr[i] < minVal) minVal = arr[i];
            }
            ans[q] = minVal;
        }
        return ans;
    }
}
