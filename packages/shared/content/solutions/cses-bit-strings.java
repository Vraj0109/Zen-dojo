class Solution {
    public int bitStrings(int n) {
        long res = 1;
        long base = 2;
        long mod = 1000000007;
        while (n > 0) {
            if ((n & 1) == 1) res = (res * base) % mod;
            base = (base * base) % mod;
            n >>= 1;
        }
        return (int) res;
    }
}
