# verify: skip-stress
from typing import List

class Solution:
    def findTargetSumWays(self, nums: List[int], target: int) -> int:
        total = sum(nums)
        if abs(target) > total or (total + target) % 2 != 0:
            return 0
        need = (total + target) // 2
        dp = [0] * (need + 1)
        dp[0] = 1
        for x in nums:
            for s in range(need, x - 1, -1):
                dp[s] += dp[s - x]
        return dp[need]