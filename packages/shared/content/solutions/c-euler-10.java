class Solution {
    public long sumOfPrimes(int limit) {
        boolean[] composite = new boolean[limit + 1];
        long total = 0;
        for (long i = 2; i < limit; i++) {
            if (composite[(int) i]) continue;
            total += i;
            for (long j = i * i; j < limit; j += i) composite[(int) j] = true;
        }
        return total;
    }
}
