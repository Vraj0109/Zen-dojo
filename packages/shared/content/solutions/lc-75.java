class Solution {
    public int[] sortColors(int[] nums) {
        int lo = 0, i = 0, hi = nums.length - 1;
        while (i <= hi) {
            if (nums[i] == 0) {
                int tmp = nums[lo];
                nums[lo] = nums[i];
                nums[i] = tmp;
                lo++;
                i++;
            } else if (nums[i] == 2) {
                int tmp = nums[hi];
                nums[hi] = nums[i];
                nums[i] = tmp;
                hi--;
            } else {
                i++;
            }
        }
        return nums;
    }
}