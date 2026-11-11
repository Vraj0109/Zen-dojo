class Solution {
    private boolean isPal(long x) {
        long r = 0, y = x;
        while (y > 0) {
            r = r * 10 + y % 10;
            y /= 10;
        }
        return r == x;
    }

    public long largestPalindromeProduct(int lo, int hi) {
        long best = 0;
        for (long a = hi; a >= lo; a--) {
            if (a * hi <= best) break;
            for (long b = hi; b >= a; b--) {
                long p = a * b;
                if (p <= best) break;
                if (isPal(p)) {
                    best = p;
                    break;
                }
            }
        }
        return best;
    }
}
