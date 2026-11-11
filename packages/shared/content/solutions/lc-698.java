import java.util.*;

class Solution {
    public boolean canPartitionKSubsets(int[] nums, int k) {
        int n = nums.length;
        long total = 0;
        for (int x : nums) total += x;
        if (total % k != 0) return false;
        int target = (int) (total / k);
        for (int x : nums) if (x > target) return false;
        int[] fill = new int[1 << n];
        Arrays.fill(fill, -1);
        fill[0] = 0;
        for (int mask = 0; mask < (1 << n); mask++) {
            if (fill[mask] < 0) continue;
            for (int i = 0; i < n; i++) {
                if ((mask & (1 << i)) != 0) continue;
                if (fill[mask] + nums[i] > target) continue;
                int nm = mask | (1 << i);
                if (fill[nm] < 0) fill[nm] = (fill[mask] + nums[i]) % target;
            }
        }
        return fill[(1 << n) - 1] == 0;
    }
}