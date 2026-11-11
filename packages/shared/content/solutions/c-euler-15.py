class Solution:
    def latticePaths(self, h: int, w: int) -> int:
        MOD = 1000000007
        n = h + w
        fact = [1] * (n + 1)
        for i in range(1, n + 1):
            fact[i] = fact[i - 1] * i % MOD
        return fact[n] * pow(fact[h], MOD - 2, MOD) % MOD * pow(fact[w], MOD - 2, MOD) % MOD
