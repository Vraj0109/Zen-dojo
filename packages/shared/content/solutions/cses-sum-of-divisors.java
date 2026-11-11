class Solution {
    public int sumOfDivisors(long n) {
        long MOD = 1000000007L;
        long INV2 = 500000004L;
        long ans = 0;
        long l = 1;
        while (l <= n) {
            long q = n / l;
            long r = n / q;
            long count = (r - l + 1) % MOD;
            long sumLR = (l % MOD + r % MOD) % MOD;
            long termSum = (sumLR * count) % MOD * INV2 % MOD;
            ans = (ans + (q % MOD) * termSum) % MOD;
            l = r + 1;
        }
        return (int) ans;
    }
}