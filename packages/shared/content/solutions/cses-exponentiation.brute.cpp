class Solution {
public:
    int exponentiation(int a, int b) {
        long long base = a;
        long long mod = 1000000007;
        long long res = 1;
        base %= mod;
        for (int i = 0; i < b; i++) {
            res = (res * base) % mod;
        }
        return (int)res;
    }
};
