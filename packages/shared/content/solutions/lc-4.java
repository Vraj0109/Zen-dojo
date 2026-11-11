class Solution {
    public double findMedianSortedArrays(int[] a, int[] b) {
        if (a.length > b.length) return findMedianSortedArrays(b, a);
        int m = a.length, n = b.length;
        int lo = 0, hi = m, half = (m + n + 1) / 2;
        long INF = 1L << 40;
        while (lo <= hi) {
            int i = (lo + hi) / 2, j = half - i;
            long aL = i > 0 ? a[i - 1] : -INF;
            long aR = i < m ? a[i] : INF;
            long bL = j > 0 ? b[j - 1] : -INF;
            long bR = j < n ? b[j] : INF;
            if (aL <= bR && bL <= aR) {
                long left = Math.max(aL, bL);
                if ((m + n) % 2 != 0) return (double) left;
                return (left + Math.min(aR, bR)) / 2.0;
            }
            if (aL > bR) hi = i - 1;
            else lo = i + 1;
        }
        return 0.0;
    }
}