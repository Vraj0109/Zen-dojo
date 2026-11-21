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
    vector<int> binomialCoefficients(vector<vector<int>>& queries) {
        const long long MOD = 1000000007;
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            int a = q[0], b = q[1];
            if (b < 0 || b > a) {
                ans.push_back(0);
                continue;
            }
            long long factA = 1, factB = 1, factAB = 1;
            for (int i = 1; i <= a; i++) factA = (factA * i) % MOD;
            for (int i = 1; i <= b; i++) factB = (factB * i) % MOD;
            for (int i = 1; i <= a - b; i++) factAB = (factAB * i) % MOD;
            long long denom = (factB * factAB) % MOD;
            long long invDenom = power(denom, MOD - 2, MOD);
            long long res = (factA * invDenom) % MOD;
            ans.push_back((int)res);
        }
        return ans;
    }
};
