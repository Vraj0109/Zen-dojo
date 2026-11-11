class Solution {
    public long largestPrimeFactor(long n) {
        long best = 1;
        for (long d = 2; d * d <= n; d++) {
            while (n % d == 0) {
                best = d;
                n /= d;
            }
        }
        return n > 1 ? n : best;
    }
}
