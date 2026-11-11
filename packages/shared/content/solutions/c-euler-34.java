class Solution {
    public int digitFactorialSum(int limit) {
        int[] f = new int[10];
        f[0] = 1;
        for (int i = 1; i < 10; i++) f[i] = f[i - 1] * i;
        int cap = (int)Math.min((long)limit, 7L * f[9]);
        long total = 0;
        for (int n = 10; n <= cap; n++) {
            int s = 0, m = n;
            while (m > 0) {
                s += f[m % 10];
                m /= 10;
            }
            if (s == n) total += n;
        }
        return (int)total;
    }
}
