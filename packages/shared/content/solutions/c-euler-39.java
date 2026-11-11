class Solution {
    private long gcd(long a, long b) {
        while (b != 0) {
            long t = b;
            b = a % b;
            a = t;
        }
        return a;
    }

    public int bestPerimeter(int maxP) {
        int[] cnt = new int[maxP + 1];
        for (long m = 2; 2 * m * (m + 1) <= maxP; m++) {
            for (long n = 1; n < m && 2 * m * (m + n) <= maxP; n++) {
                if (((m - n) & 1) == 0 || gcd(m, n) != 1) continue;
                long q = 2 * m * (m + n);
                for (long k = q; k <= maxP; k += q) {
                    cnt[(int)k]++;
                }
            }
        }
        int best = 12;
        for (int p = 12; p <= maxP; p++) {
            if (cnt[p] > cnt[best]) best = p;
        }
        return best;
    }
}
