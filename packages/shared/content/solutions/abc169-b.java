class Solution {
    public long productOrMinusOne(long[] a) {
        long LIM = 1000000000000000L;
        for (long x : a) {
            if (x == 0) return 0;
        }
        long cur = 1;
        for (long x : a) {
            if (cur > LIM / x) return -1;
            cur *= x;
        }
        return cur;
    }
}
