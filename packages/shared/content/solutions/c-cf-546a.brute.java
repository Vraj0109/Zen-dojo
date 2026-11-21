class Solution {
    public long borrowMoney(int k, int n, int w) {
        long total = 0;
        for (int i = 1; i <= w; i++) {
            total += (long) i * k;
        }
        return Math.max(0L, total - n);
    }
}
