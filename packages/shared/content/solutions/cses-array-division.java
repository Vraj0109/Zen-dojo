class Solution {
    public long arrayDivision(int[] arr, int k) {
        long lo = 0, hi = 0;
        for (int x : arr) {
            lo = Math.max(lo, (long) x);
            hi += x;
        }
        long ans = hi;
        while (lo <= hi) {
            long mid = lo + (hi - lo) / 2;
            int count = 1;
            long cur = 0;
            for (int x : arr) {
                if (cur + x > mid) {
                    count++;
                    cur = x;
                } else {
                    cur += x;
                }
            }
            if (count <= k) {
                ans = mid;
                hi = mid - 1;
            } else {
                lo = mid + 1;
            }
        }
        return ans;
    }
}
