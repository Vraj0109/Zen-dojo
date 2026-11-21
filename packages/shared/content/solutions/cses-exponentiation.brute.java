class Solution {
    public int exponentiation(int a, int b) {
        long base = a;
        long mod = 1000000007L;
        long res = 1;
        base %= mod;
        for (int i = 0; i < b; i++) {
            res = (res * base) % mod;
        }
        return (int)res;
    }
}
