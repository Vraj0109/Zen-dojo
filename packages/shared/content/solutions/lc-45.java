class Solution {
    public int jump(int[] nums) {
        int jumps = 0, curEnd = 0, farthest = 0, n = nums.length;
        for (int i = 0; i < n - 1; i++) {
            farthest = Math.max(farthest, i + nums[i]);
            if (i == curEnd) {
                jumps++;
                curEnd = farthest;
            }
        }
        return jumps;
    }
}