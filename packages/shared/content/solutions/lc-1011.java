class Solution {
    public int shipWithinDays(int[] weights, int days) {
        int lo = 0, hi = 0;
        for (int w : weights) {
            lo = Math.max(lo, w);
            hi += w;
        }
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            int used = 1, load = 0;
            for (int w : weights) {
                if (load + w > mid) {
                    used++;
                    load = 0;
                }
                load += w;
            }
            if (used <= days) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }
}