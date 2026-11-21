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
    int bracketSequencesI(int n) {
        if (n % 2 != 0) return 0;
        int k = n / 2;
        if (k == 0) return 1;
        const long long MOD = 1000000007;
        vector<long long> fact(2 * k + 1, 1);
        for (int i = 2; i <= 2 * k; i++) {
            fact[i] = (fact[i - 1] * i) % MOD;
        }
        long long denom = (fact[k] * fact[k]) % MOD;
        denom = (denom * (k + 1)) % MOD;
        long long ans = fact[2 * k] * power(denom, MOD - 2, MOD) % MOD;
        return (int)ans;
    }
};
