class Solution {
    public long smallestMultiple(int n) {
        long result = 1;
        for (int i = 2; i <= n; i++) result = result / gcd(result, (long) i) * i;
        return result;
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
