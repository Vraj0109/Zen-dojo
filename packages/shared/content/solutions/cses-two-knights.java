class Solution {
    public long[] twoKnights(int n) {
        long[] res = new long[n];
        for (int i = 0; i < n; i++) {
            long k = i + 1;
            long total = (k * k) * (k * k - 1) / 2;
            long attack = 4 * (k - 1) * (k - 2);
            res[i] = total - attack;
        }
        return res;
    }
}
