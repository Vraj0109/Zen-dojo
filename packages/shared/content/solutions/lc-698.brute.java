import java.util.*;

class Solution {
    private boolean backtrack(int[] nums, int idx, int[] buckets, int target) {
        if (idx == nums.length) {
            return true;
        }
        for (int i = 0; i < buckets.length; i++) {
            if (buckets[i] + nums[idx] <= target) {
                buckets[i] += nums[idx];
                if (backtrack(nums, idx + 1, buckets, target)) {
                    return true;
                }
                buckets[i] -= nums[idx];
            }
            if (buckets[i] == 0) break;
        }
        return false;
    }

    public boolean canPartitionKSubsets(int[] nums, int k) {
        int total = 0;
        for (int x : nums) total += x;
        if (total % k != 0) return false;
        int target = total / k;

        Arrays.sort(nums);
        // Reverse array for descending order
        for (int i = 0, j = nums.length - 1; i < j; i++, j--) {
            int tmp = nums[i];
            nums[i] = nums[j];
            nums[j] = tmp;
        }
        if (nums[0] > target) return false;

        int[] buckets = new int[k];
        return backtrack(nums, 0, buckets, target);
    }
}
