class Solution {
    private long lo, hi;
    private long sortCount(long[] p, long[] tmp, int l, int r) {
        if (r - l <= 1) return 0;
        int m = (l + r) / 2;
        long res = sortCount(p, tmp, l, m) + sortCount(p, tmp, m, r);
        int a = l, b = l;
        for (int j = m; j < r; j++) {
            while (a < m && p[j] - p[a] > hi) a++;
            while (b < m && p[j] - p[b] >= lo) b++;
            res += b - a;
        }
        int p1 = l, p2 = m, idx = l;
        while (p1 < m && p2 < r) {
            if (p[p1] <= p[p2]) tmp[idx++] = p[p1++];
            else tmp[idx++] = p[p2++];
        }
        while (p1 < m) tmp[idx++] = p[p1++];
        while (p2 < r) tmp[idx++] = p[p2++];
        System.arraycopy(tmp, l, p, l, r - l);
        return res;
    }
    public int countRangeSum(int[] nums, int lower, int upper) {
        lo = lower;
        hi = upper;
        int n = nums.length;
        long[] p = new long[n + 1];
        long[] tmp = new long[n + 1];
        for (int i = 0; i < n; i++) p[i + 1] = p[i] + nums[i];
        return (int) sortCount(p, tmp, 0, n + 1);
    }
}