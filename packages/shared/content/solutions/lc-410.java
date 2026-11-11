class Solution {
    public int splitArray(int[] nums, int k) {
        long lo = 0, hi = 0;
        for (int x : nums) {
            lo = Math.max(lo, x);
            hi += x;
        }
        while (lo < hi) {
            long mid = lo + (hi - lo) / 2;
            long cur = 0;
            int parts = 1;
            for (int x : nums) {
                if (cur + x > mid) {
                    parts++;
                    cur = 0;
                }
                cur += x;
            }
            if (parts <= k) hi = mid;
            else lo = mid + 1;
        }
        return (int) lo;
    }
}