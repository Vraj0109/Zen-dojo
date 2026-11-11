class Solution {
    public int truncatablePrimeSum(int limit) {
        boolean[] comp = new boolean[limit + 2];
        comp[0] = comp[1] = true;
        for (long i = 2; i * i <= limit; i++) {
            if (!comp[(int)i]) {
                for (long j = i * i; j <= limit; j += i) {
                    comp[(int)j] = true;
                }
            }
        }
        long total = 0;
        for (int p = 11; p < limit; p++) {
            if (comp[p]) continue;
            boolean ok = true;
            for (int v = p / 10; v > 0 && ok; v /= 10) {
                if (comp[v]) ok = false;
            }
            for (long m = 10; m <= p && ok; m *= 10) {
                int v = (int)(p % m);
                if (v < m / 10 || comp[v]) ok = false;
            }
            if (ok) total += p;
        }
        return (int)total;
    }
}
