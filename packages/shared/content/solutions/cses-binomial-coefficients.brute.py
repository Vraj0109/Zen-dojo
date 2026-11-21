class Solution:
    def binomialCoefficients(self, queries: list[list[int]]) -> list[int]:
        MOD = 1000000007
        ans = []
        for a, b in queries:
            if b < 0 or b > a:
                ans.append(0)
                continue
            fact_a, fact_b, fact_ab = 1, 1, 1
            for i in range(1, a + 1):
                fact_a = (fact_a * i) % MOD
            for i in range(1, b + 1):
                fact_b = (fact_b * i) % MOD
            for i in range(1, a - b + 1):
                fact_ab = (fact_ab * i) % MOD
            denom = (fact_b * fact_ab) % MOD
            inv_denom = pow(denom, MOD - 2, MOD)
            ans.append((fact_a * inv_denom) % MOD)
        return ans
