import java.util.*;

class Solution {
    public int singleNumber(int[] nums) {
        Set<Integer> seen = new HashSet<>();
        for (int x : nums) {
            if (seen.contains(x)) seen.remove(x);
            else seen.add(x);
        }
        return seen.iterator().next();
    }
}
