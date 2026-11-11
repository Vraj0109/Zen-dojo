class Solution {
    public double myPow(double x, int n) {
        long e = n;
        boolean neg = e < 0;
        if (neg) e = -e;
        double result = 1.0, base = x;
        while (e > 0) {
            if ((e & 1) != 0) result *= base;
            base *= base;
            e >>= 1;
        }
        return neg ? 1.0 / result : result;
    }
}