#include <string>
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
    int creatingStringsII(string s) {
        const long long MOD = 1000000007;
        int n = s.size();
        vector<long long> fact(n + 1, 1);
        for (int i = 2; i <= n; i++) {
            fact[i] = (fact[i - 1] * i) % MOD;
        }
        vector<int> cnt(26, 0);
        for (char c : s) cnt[c - 'a']++;

        long long denom = 1;
        for (int i = 0; i < 26; i++) {
            if (cnt[i] > 1) {
                denom = (denom * fact[cnt[i]]) % MOD;
            }
        }
        long long ans = fact[n] * power(denom, MOD - 2, MOD) % MOD;
        return (int)ans;
    }
};
