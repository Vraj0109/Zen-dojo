class Solution {
    private long f(long limit, long d) {
        long m = (limit - 1) / d;
        return d * m * (m + 1) / 2;
    }

    public long sumOfMultiples(int limit, int a, int b) {
        long l = (long) a / gcd(a, b) * b;
        return f(limit, a) + f(limit, b) - f(limit, l);
    }

    private long gcd(long a, long b) {
        while (b != 0) {
            long t = b;
            b = a % b;
            a = t;
        }
        return a;
    }
}
