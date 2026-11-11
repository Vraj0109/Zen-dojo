import java.util.*;

class Solution {
    public int[] removeDuplicates(int[] nums) {
        int w = 0;
        for (int x : nums) {
            if (w == 0 || nums[w - 1] != x) nums[w++] = x;
        }
        return Arrays.copyOf(nums, w);
    }
}