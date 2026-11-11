import java.util.*;

class Solution {
    public int detectCycle(int[] nums, int pos) {
        int n = nums.length;
        if (n == 0) return -1;
        int slow = 0, fast = 0;
        while (true) {
            slow = slow + 1 < n ? slow + 1 : pos;
            if (slow < 0) return -1;
            fast = fast + 1 < n ? fast + 1 : pos;
            if (fast < 0) return -1;
            fast = fast + 1 < n ? fast + 1 : pos;
            if (fast < 0) return -1;
            if (slow == fast) break;
        }
        slow = 0;
        while (slow != fast) {
            slow = slow + 1 < n ? slow + 1 : pos;
            fast = fast + 1 < n ? fast + 1 : pos;
        }
        return slow;
    }
}
