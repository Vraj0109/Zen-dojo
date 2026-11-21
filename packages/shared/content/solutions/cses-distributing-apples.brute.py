class Solution:
    def distributingApples(self, n: int, m: int) -> int:
        MOD = 1000000007
        total = n + m - 1
        fact = [1] * (total + 1)
        for i in range(1, total + 1):
            fact[i] = (fact[i - 1] * i) % MOD
        denom = (fact[n - 1] * fact[m]) % MOD
        return (fact[total] * pow(denom, MOD - 2, MOD)) % MOD
