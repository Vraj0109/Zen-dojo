class Solution {
    public long[] greedyTakahashi(long a, long b, long k) {
        long x = Math.min(a, k);
        a -= x;
        k -= x;
        long y = Math.min(b, k);
        b -= y;
        return new long[]{a, b};
    }
}
