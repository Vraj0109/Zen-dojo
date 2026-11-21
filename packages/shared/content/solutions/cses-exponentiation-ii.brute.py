class Solution:
    def exponentiationII(self, queries: list[list[int]]) -> list[int]:
        MOD = 1000000007
        PHI = 1000000006
        ans = []
        for a, b, c in queries:
            exp = pow(b, c, PHI)
            ans.append(pow(a, exp, MOD))
        return ans
