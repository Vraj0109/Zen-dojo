import java.util.*;

class Solution {
    public int[][] subsets(int[] nums) {
        int n = nums.length;
        int total = 1 << n;
        int[][] res = new int[total][];
        for (int mask = 0; mask < total; mask++) {
            int count = Integer.bitCount(mask);
            int[] cur = new int[count];
            int idx = 0;
            for (int i = 0; i < n; i++) {
                if ((mask & (1 << i)) != 0) {
                    cur[idx++] = nums[i];
                }
            }
            res[mask] = cur;
        }
        return res;
    }
}
