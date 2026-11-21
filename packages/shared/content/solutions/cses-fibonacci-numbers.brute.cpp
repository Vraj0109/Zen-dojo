class Solution {
    long long multiply(long long a, long long b, long long mod) {
        return (a * b) % mod;
    }
public:
    int fibonacciNumbers(long long n) {
        if (n == 0) return 0;
        if (n == 1) return 1;
        const long long MOD = 1000000007;
        if (n > 50000000LL) {
            auto mul = [&](const vector<vector<long long>>& A, const vector<vector<long long>>& B) {
                vector<vector<long long>> C(2, vector<long long>(2, 0));
                for (int i = 0; i < 2; i++) {
                    for (int j = 0; j < 2; j++) {
                        for (int k = 0; k < 2; k++) {
                            C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % MOD;
                        }
                    }
                }
                return C;
            };
            vector<vector<long long>> res = {{1, 0}, {0, 1}};
            vector<vector<long long>> base = {{1, 1}, {1, 0}};
            long long exp = n;
            while (exp > 0) {
                if (exp & 1) res = mul(res, base);
                base = mul(base, base);
                exp >>= 1;
            }
            return (int)res[0][1];
        }
        long long a = 0, b = 1;
        for (long long i = 2; i <= n; i++) {
            long long c = (a + b) % MOD;
            a = b;
            b = c;
        }
        return (int)b;
    }
};
