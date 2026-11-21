#include <vector>

using namespace std;

class Solution {
    long long power(long long base, long long exp, long long mod) {
        long long res = 1;
        base %= mod;
        while (exp > 0) {
            if (exp & 1) res = (res * base) % mod;
            base = (base * base) % mod;
            exp >>= 1;
        }
        return res;
    }
public:
    int distributingApples(int n, int m) {
        const long long MOD = 1000000007;
        int total = n + m - 1;
        vector<long long> fact(total + 1, 1);
        for (int i = 2; i <= total; i++) {
            fact[i] = (fact[i - 1] * i) % MOD;
        }
        long long denom = (fact[n - 1] * fact[m]) % MOD;
        long long ans = fact[total] * power(denom, MOD - 2, MOD) % MOD;
        return (int)ans;
    }
};
