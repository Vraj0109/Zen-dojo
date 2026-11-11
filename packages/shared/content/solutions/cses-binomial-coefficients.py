from typing import List

class Solution:
    def binomialCoefficients(self, queries: List[List[int]]) -> List[int]:
        MOD = 1000000007
        max_a = 1
        for a, b in queries:
            if a > max_a:
                max_a = a

        fact = [1] * (max_a + 1)
        for i in range(2, max_a + 1):
            fact[i] = (fact[i - 1] * i) % MOD

        inv_fact = [1] * (max_a + 1)
        inv_fact[max_a] = pow(fact[max_a], MOD - 2, MOD)
        for i in range(max_a - 1, -1, -1):
            inv_fact[i] = (inv_fact[i + 1] * (i + 1)) % MOD

        ans = []
        for a, b in queries:
            if b < 0 or b > a:
                ans.append(0)
            else:
                cur = fact[a] * inv_fact[b] % MOD
                cur = cur * inv_fact[a - b] % MOD
                ans.append(cur)
        return ans
