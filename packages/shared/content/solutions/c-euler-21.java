class Solution {
    public long amicableSum(int limit) {
        int[] d = new int[limit + 1];
        for (int i = 1; i < limit; i++) {
            for (int j = 2 * i; j < limit; j += i) {
                d[j] += i;
            }
        }
        long total = 0;
        for (int a = 1; a < limit; a++) {
            int b = d[a];
            if (b != a && b < limit && d[b] == a) {
                total += a;
            }
        }
        return total;
    }
}
