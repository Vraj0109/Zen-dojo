class Solution {
    public long appleDivision(long[] weights) {
        int n = weights.length;
        long total = 0;
        for (long w : weights) total += w;
        long best = Long.MAX_VALUE;
        for (int mask = 0; mask < (1 << n); mask++) {
            long s = 0;
            for (int i = 0; i < n; i++) {
                if ((mask & (1 << i)) != 0) s += weights[i];
            }
            best = Math.min(best, Math.abs(total - 2 * s));
        }
        return best;
    }
}
