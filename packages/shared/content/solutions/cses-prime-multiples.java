class Solution {
    public long primeMultiples(long n, long[] primes) {
        int k = primes.length;
        long ans = 0;
        int totalSubsets = 1 << k;
        for (int mask = 1; mask < totalSubsets; mask++) {
            int bits = 0;
            long prod = 1;
            boolean overflow = false;
            for (int i = 0; i < k; i++) {
                if (((mask >> i) & 1) != 0) {
                    bits++;
                    if (primes[i] > n / prod) {
                        overflow = true;
                        break;
                    }
                    prod *= primes[i];
                }
            }
            if (overflow) continue;
            long count = n / prod;
            if (bits % 2 == 1) {
                ans += count;
            } else {
                ans -= count;
            }
        }
        return ans;
    }
}