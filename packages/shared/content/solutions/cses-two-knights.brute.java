class Solution {
    public long[] twoKnights(int n) {
        long[] res = new long[n];
        for (long k = 1; k <= n; k++) {
            long total = (k * k) * (k * k - 1) / 2;
            long attack = 4 * (k - 1) * (k - 2);
            res[(int) k - 1] = total - attack;
        }
        return res;
    }
}
