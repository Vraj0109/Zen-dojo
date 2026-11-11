# verify: skip-stress
from collections import Counter

class Solution:
    def creatingStringsII(self, s: str) -> int:
        MOD = 1_000_000_007
        n = len(s)
        fact = [1] * (n + 1)
        for i in range(1, n + 1):
            fact[i] = (fact[i - 1] * i) % MOD
        cnt = Counter(s)
        denom = 1
        for c in cnt.values():
            if c > 1:
                denom = (denom * fact[c]) % MOD
        ans = fact[n] * pow(denom, MOD - 2, MOD) % MOD
        return ans