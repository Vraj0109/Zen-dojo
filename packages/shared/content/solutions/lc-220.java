import java.util.*;

class Solution {
    public boolean containsNearbyAlmostDuplicate(int[] nums, int indexDiff, int valueDiff) {
        TreeSet<Long> window = new TreeSet<>();
        for (int i = 0; i < nums.length; i++) {
            Long floor = window.ceiling((long) nums[i] - valueDiff);
            if (floor != null && floor <= (long) nums[i] + valueDiff) return true;
            window.add((long) nums[i]);
            if (i >= indexDiff) window.remove((long) nums[i - indexDiff]);
        }
        return false;
    }
}