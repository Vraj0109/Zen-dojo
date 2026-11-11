# verify: skip-stress
from typing import List

class Solution:
    def canPartition(self, nums: List[int]) -> bool:
        total = sum(nums)
        if total % 2 != 0:
            return False
        target = total // 2
        reach = [False] * (target + 1)
        reach[0] = True
        for x in nums:
            for s in range(target, x - 1, -1):
                if reach[s - x]:
                    reach[s] = True
        return reach[target]