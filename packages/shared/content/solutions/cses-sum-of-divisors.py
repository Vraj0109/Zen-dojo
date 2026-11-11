# verify: skip-stress
class Solution:
    def sumOfDivisors(self, n: int) -> int:
        MOD = 1_000_000_007
        INV2 = 500000004
        ans = 0
        l = 1
        while l <= n:
            q = n // l
            r = n // q
            count = (r - l + 1) % MOD
            sum_lr = (l % MOD + r % MOD) % MOD
            term_sum = (sum_lr * count) % MOD * INV2 % MOD
            ans = (ans + (q % MOD) * term_sum) % MOD
            l = r + 1
        return ans