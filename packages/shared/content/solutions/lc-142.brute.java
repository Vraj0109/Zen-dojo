import java.util.*;

class Solution {
    public int detectCycle(int[] nums, int pos) {
        int n = nums.length;
        if (n == 0) return -1;
        Set<Integer> visited = new HashSet<>();
        int cur = 0;
        while (cur >= 0) {
            if (visited.contains(cur)) return cur;
            visited.add(cur);
            cur = (cur + 1 < n) ? cur + 1 : pos;
        }
        return -1;
    }
}
