class Solution {
    public int[] rangeSumQuery(int[] nums, int[][] queries) {
        int n = nums.length;
        long[] pref = new long[n + 1];
        for (int i = 0; i < n; i++) pref[i + 1] = pref[i] + nums[i];

        int[] res = new int[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int l = queries[i][0], r = queries[i][1];
            res[i] = (int)(pref[r + 1] - pref[l]);
        }
        return res;
    }
}
