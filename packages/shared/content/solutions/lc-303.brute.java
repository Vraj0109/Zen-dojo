import java.util.*;

class Solution {
    public int[] rangeSumQuery(int[] nums, int[][] queries) {
        int[] res = new int[queries.length];
        for (int i = 0; i < queries.length; i++) {
            int l = queries[i][0], r = queries[i][1];
            long sum = 0;
            for (int j = l; j <= r; j++) {
                sum += nums[j];
            }
            res[i] = (int) sum;
        }
        return res;
    }
}
