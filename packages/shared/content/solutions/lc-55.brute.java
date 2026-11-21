class Solution {
    private boolean canReach(int[] nums, int pos) {
        if (pos >= nums.length - 1) return true;
        for (int step = 1; step <= nums[pos]; step++) {
            if (canReach(nums, pos + step)) return true;
        }
        return false;
    }

    public boolean canJump(int[] nums) {
        return canReach(nums, 0);
    }
}
