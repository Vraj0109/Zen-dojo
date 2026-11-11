class Solution {
    public int digitPowerSum(int p) {
        long[] pw = new long[10];
        for (int d = 0; d < 10; d++) {
            pw[d] = 1;
            for (int i = 0; i < p; i++) pw[d] *= d;
        }
        long limit = (long)(p + 1) * pw[9];
        long total = 0;
        for (long n = 10; n <= limit; n++) {
            long s = 0, m = n;
            while (m > 0) {
                s += pw[(int)(m % 10)];
                m /= 10;
            }
            if (s == n) total += n;
        }
        return (int)total;
    }
}
