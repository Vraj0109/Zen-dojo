class Solution {
public:
    int sumOfDivisors(long long n) {
        const long long MOD = 1000000007;
        const long long INV2 = 500000004;
        long long ans = 0;
        long long l = 1;
        while (l <= n) {
            long long q = n / l;
            long long r = n / q;
            long long count = (r - l + 1) % MOD;
            long long sumLR = (l % MOD + r % MOD) % MOD;
            long long termSum = (sumLR * count) % MOD * INV2 % MOD;
            ans = (ans + (q % MOD) * termSum) % MOD;
            l = r + 1;
        }
        return (int)ans;
    }
};
