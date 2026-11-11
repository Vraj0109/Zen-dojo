class Solution {
    public int[] rangeXorQueries(int[] arr, int[][] queries) {
        int n = arr.length;
        int[] pref = new int[n + 1];
        for (int i = 0; i < n; i++) pref[i + 1] = pref[i] ^ arr[i];
        int[] ans = new int[queries.length];
        for (int i = 0; i < queries.length; i++) {
            ans[i] = pref[queries[i][1]] ^ pref[queries[i][0] - 1];
        }
        return ans;
    }
}
