class Solution {
    public long flagstones(int n, int m, int a) {
        long x = ((long)n + a - 1) / a;
        long y = ((long)m + a - 1) / a;
        return x * y;
    }
}
