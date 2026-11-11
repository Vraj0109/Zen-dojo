class Solution {
    private int divisors(long x) {
        int count = 1;
        for (long p = 2; p * p <= x; p++) {
            int e = 0;
            while (x % p == 0) { x /= p; e++; }
            count *= e + 1;
        }
        if (x > 1) count *= 2;
        return count;
    }

    public long firstTriangleWithDivisors(int minDivisors) {
        for (long k = 1; ; k++) {
            long a = k, b = k + 1;
            if (a % 2 == 0) a /= 2; else b /= 2;
            if (divisors(a) * divisors(b) > minDivisors) return k * (k + 1) / 2;
        }
    }
}
