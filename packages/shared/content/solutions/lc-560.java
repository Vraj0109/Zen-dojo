import java.util.*;

class Solution {
    public int subarraySum(int[] nums, int k) {
        Map<Long, Integer> seen = new HashMap<>();
        seen.put(0L, 1);
        long prefix = 0;
        int total = 0;
        for (int x : nums) {
            prefix += x;
            total += seen.getOrDefault(prefix - k, 0);
            seen.put(prefix, seen.getOrDefault(prefix, 0) + 1);
        }
        return total;
    }
}