class Solution {
    private long pw(long base, int e) {
        long r = 1;
        base %= 1337;
        while (e > 0) {
            if ((e & 1) != 0) r = r * base % 1337;
            base = base * base % 1337;
            e >>= 1;
        }
        return r;
    }
    public int superPow(int a, int[] b) {
        long result = 1;
        for (int d : b) {
            result = pw(result, 10) * pw(a, d) % 1337;
        }
        return (int) result;
    }
}