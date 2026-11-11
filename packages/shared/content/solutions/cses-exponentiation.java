class Solution {
    public int exponentiation(int a, int b) {
        long base = a;
        long exp = b;
        long mod = 1000000007;
        long res = 1;
        base %= mod;
        while (exp > 0) {
            if ((exp & 1) == 1) res = (res * base) % mod;
            base = (base * base) % mod;
            exp >>= 1;
        }
        return (int) res;
    }
}
