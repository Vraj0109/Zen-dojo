import java.util.*;

class Solution {
    public int shortestSubarray(int[] nums, int k) {
        int n = nums.length;
        long[] p = new long[n + 1];
        for (int i = 0; i < n; i++) p[i + 1] = p[i] + nums[i];
        Deque<Integer> dq = new ArrayDeque<>();
        int best = n + 1;
        for (int j = 0; j <= n; j++) {
            while (!dq.isEmpty() && p[j] - p[dq.peekFirst()] >= k) {
                best = Math.min(best, j - dq.pollFirst());
            }
            while (!dq.isEmpty() && p[dq.peekLast()] >= p[j]) {
                dq.pollLast();
            }
            dq.offerLast(j);
        }
        return best <= n ? best : -1;
    }
}