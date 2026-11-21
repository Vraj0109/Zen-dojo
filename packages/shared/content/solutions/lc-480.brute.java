import java.util.*;

class Solution {
    public long[] slidingWindowMedian(int[] nums, int k) {
        int n = nums.length;
        long[] out = new long[n - k + 1];
        for (int i = 0; i <= n - k; i++) {
            long[] window = new long[k];
            for (int j = 0; j < k; j++) {
                window[j] = nums[i + j];
            }
            Arrays.sort(window);
            if (k % 2 == 1) {
                out[i] = 2L * window[k / 2];
            } else {
                out[i] = window[k / 2 - 1] + window[k / 2];
            }
        }
        return out;
    }
}
