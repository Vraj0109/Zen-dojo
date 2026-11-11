class Solution {
    public long evenFibonacciSum(long limit) {
        long a = 1, b = 2, total = 0;
        while (a <= limit) {
            if (a % 2 == 0) total += a;
            long c = a + b;
            a = b;
            b = c;
        }
        return total;
    }
}
