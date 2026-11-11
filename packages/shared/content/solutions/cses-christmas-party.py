# verify: skip-stress
class Solution:
    def christmasParty(self, n: int) -> int:
        if n <= 1:
            return 0
        if n == 2:
            return 1
        MOD = 1_000_000_007
        prev2 = 0
        prev1 = 1
        for i in range(3, n + 1):
            cur = ((i - 1) * (prev1 + prev2)) % MOD
            prev2 = prev1
            prev1 = cur
        return prev1