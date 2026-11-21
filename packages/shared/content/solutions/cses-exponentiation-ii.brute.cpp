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
    vector<int> exponentiationII(vector<vector<int>>& queries) {
        const long long MOD = 1000000007;
        const long long PHI = 1000000006;
        vector<int> ans;
        ans.reserve(queries.size());
        for (const auto& q : queries) {
            long long a = q[0], b = q[1], c = q[2];
            long long exp = power(b, c, PHI);
            long long res = power(a, exp, MOD);
            ans.push_back((int)res);
        }
        return ans;
    }
};
