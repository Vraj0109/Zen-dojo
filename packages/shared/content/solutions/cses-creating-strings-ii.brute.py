from collections import Counter
import math

class Solution:
    def creatingStringsII(self, s: str) -> int:
        MOD = 1000000007
        n = len(s)
        fact = [1] * (n + 1)
        for i in range(1, n + 1):
            fact[i] = (fact[i - 1] * i) % MOD
        cnt = Counter(s)
        denom = 1
        for c, count in cnt.items():
            if count > 1:
                denom = (denom * fact[count]) % MOD
        ans = (fact[n] * pow(denom, MOD - 2, MOD)) % MOD
        return ans
