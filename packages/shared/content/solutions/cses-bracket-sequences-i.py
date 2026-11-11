# verify: skip-stress
class Solution:
    def bracketSequencesI(self, n: int) -> int:
        if n % 2 != 0:
            return 0
        k = n // 2
        if k == 0:
            return 1
        MOD = 1_000_000_007
        fact = [1] * (2 * k + 1)
        for i in range(1, 2 * k + 1):
            fact[i] = (fact[i - 1] * i) % MOD
        denom = (fact[k] * fact[k]) % MOD
        denom = (denom * (k + 1)) % MOD
        ans = fact[2 * k] * pow(denom, MOD - 2, MOD) % MOD
        return ans