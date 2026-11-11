# verify: skip-stress
from typing import List

class Solution:
    def exponentiationII(self, queries: List[List[int]]) -> List[int]:
        MOD = 1_000_000_007
        PHI = 1_000_000_006
        ans = []
        for a, b, c in queries:
            exp = pow(b, c, PHI)
            res = pow(a, exp, MOD)
            ans.append(res)
        return ans