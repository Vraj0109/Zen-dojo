class Solution {
    public long borrowMoney(int k, int n, int w) {
        long total = (long)k * w * (w + 1) / 2;
        return Math.max(0L, total - n);
    }
}
